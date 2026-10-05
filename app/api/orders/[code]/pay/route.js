import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { lockOrder, moneyByOrder, orderMoney, publicPayment } from "@/lib/finance";
import { gatewayMode, startGatewayPayment } from "@/lib/gateway";
import { NOT_PAYABLE_STATUSES } from "@/lib/order-constants";
import { rateLimit } from "@/lib/rate-limit";
import { payOrderSchema } from "@/lib/schemas";
import { debitWallet } from "@/lib/wallet";

/**
 * پرداخت سفارش (بعد از ثبت). بدنه: { useWallet: boolean }
 *  • useWallet=true  → تا سقف موجودی/مبلغ مانده از کیف پول کم می‌شه، «بقیه» (اگه مانده‌ای بود) از درگاه.
 *  • useWallet=false → کل مبلغ مانده از درگاه.
 * اگه بعد از کیف پول چیزی نمونه، {paid: true} برمی‌گرده؛ وگرنه {redirectUrl} برای رفتن به درگاه.
 * کیف پول و ساخت تراکنش‌ها با هم و زیر قفل ردیف سفارش انجام می‌شن.
 */
export const POST = handler(async (request, { params }) => {
  const user = await requireApiUser();
  const { code } = await params;
  if (!/^\d{8}$/.test(code)) throw new ApiError(400, "کد سفارش نامعتبر است");
  await rateLimit(`pay:${user.id}`, 30, 60 * 60, "تعداد تلاش‌های پرداخت بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.");
  const { useWallet } = payOrderSchema.parse(await readJson(request));

  const order = await prisma.order.findFirst({ where: { code, userId: user.id } });
  if (!order) throw new ApiError(404, "سفارش پیدا نشد");
  if (NOT_PAYABLE_STATUSES.includes(order.status)) throw new ApiError(409, "این سفارش لغو شده و قابل پرداخت نیست");

  // ───── ۱) طرح پرداخت (بدون قفل؛ بعداً داخل تراکنش دوباره چک می‌شه) ─────
  const money = (await moneyByOrder(prisma, [order.id])).get(order.id);
  const { remaining } = publicPayment(order, money);
  if (remaining <= 0) {
    throw new ApiError(409, money.paidPending - money.gatewayPending > 0
      ? "پرداخت این سفارش در انتظار تأیید است"
      : "این سفارش قبلاً پرداخت شده است");
  }
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
  const walletPart = useWallet ? Math.min(fresh.walletBalance, remaining) : 0;
  const gatewayPart = remaining - walletPart;

  if (useWallet && walletPart === 0) throw new ApiError(409, "موجودی کیف پول شما صفر است");
  if (gatewayPart > 0 && gatewayMode() === "none") {
    throw new ApiError(503, "پرداخت آنلاین در حال حاضر فعال نیست. می‌توانید با شارژ کیف پول یا تماس با پشتیبانی پرداخت کنید.");
  }

  // ───── ۲) شروع درگاه (قبل از برداشت از کیف پول؛ اگه درگاه خطا بده چیزی از کیف پول کم نشده) ─────
  const gateway = gatewayPart > 0 ? await startGatewayPayment({ amount: gatewayPart, orderCode: code, mobile: user.phone }) : null;

  // ───── ۳) ثبت نهایی: داخل یک تراکنش و زیر قفل سفارش ─────
  await prisma.$transaction(
    async (tx) => {
      await lockOrder(tx, order.id);
      const current = await tx.order.findUnique({ where: { id: order.id } });
      if (NOT_PAYABLE_STATUSES.includes(current.status)) throw new ApiError(409, "این سفارش لغو شده و قابل پرداخت نیست");

      // تلاش‌های قبلیِ ناتمام درگاه کنار گذاشته می‌شن
      await tx.transaction.updateMany({
        where: { orderId: order.id, type: "PAYMENT", status: "PENDING", authority: { not: null } },
        data: { status: "FAILED", note: "پرداخت ناتمام؛ با تلاش جدید جایگزین شد" },
      });
      const now = await orderMoney(tx, order.id);
      if (current.payable - now.paidActive !== remaining) {
        throw new ApiError(409, "وضعیت پرداخت این سفارش تغییر کرد. صفحه را تازه کنید و دوباره تلاش کنید.");
      }

      if (walletPart > 0) {
        await debitWallet(tx, {
          userId: user.id,
          amount: walletPart,
          reason: "ORDER_PAYMENT",
          orderCode: code,
          note: `پرداخت سفارش ${code}`,
        });
        await tx.transaction.create({
          data: {
            type: "PAYMENT",
            status: "SUCCESS",
            method: "WALLET",
            amount: walletPart,
            orderId: order.id,
            userId: user.id,
            note: "پرداخت از کیف پول",
          },
        });
      }
      if (gateway) {
        await tx.transaction.create({
          data: {
            type: "PAYMENT",
            status: "PENDING",
            method: "ONLINE",
            amount: gatewayPart,
            orderId: order.id,
            userId: user.id,
            authority: gateway.authority,
            note: "در انتظار پرداخت از درگاه",
          },
        });
      }
    },
    { timeout: 20_000 },
  );

  const after = await prisma.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
  return ok({
    paid: !gateway,
    walletPaid: walletPart,
    gatewayAmount: gatewayPart,
    redirectUrl: gateway?.redirectUrl ?? null,
    walletBalance: after?.walletBalance ?? 0,
  });
});
