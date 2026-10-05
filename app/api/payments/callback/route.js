import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { lockOrder, refundOrderToWallet } from "@/lib/finance";
import { siteOrigin, verifyGatewayPayment } from "@/lib/gateway";
import { NOT_PAYABLE_STATUSES } from "@/lib/order-constants";

/**
 * برگشت کاربر از درگاه (زرین‌پال: ?Authority=…&Status=OK|NOK).
 * ورود به سایت لازم نیست؛ تراکنش از روی Authority پیدا می‌شه و مبلغ همیشه از دیتابیس خونده می‌شه.
 * نتیجه با ریدایرکت به صفحه‌ی سفارش‌ها اعلام می‌شه (?pay=success|failed|refunded&order=کد).
 */
export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const authority = (sp.get("Authority") || sp.get("authority") || "").slice(0, 100);
  const gatewayOk = (sp.get("Status") || sp.get("status") || "").toUpperCase() === "OK";
  const origin = await siteOrigin();

  const back = (state, code) => {
    const url = new URL("/profile", origin);
    url.searchParams.set("tab", "orders");
    url.searchParams.set("pay", state);
    if (code) url.searchParams.set("order", code);
    return NextResponse.redirect(url);
  };

  if (!authority) return back("failed");
  const tx0 = await prisma.transaction.findUnique({ where: { authority }, include: { order: true } });
  if (!tx0) return back("failed");
  const code = tx0.order.code;

  // قبلاً پردازش شده (رفرش صفحه / برگشت دوباره)
  if (tx0.status === "SUCCESS") return back("success", code);
  if (tx0.status === "FAILED" && !gatewayOk) return back("failed", code);

  if (!gatewayOk) {
    await prisma.transaction.updateMany({
      where: { id: tx0.id, status: "PENDING" },
      data: { status: "FAILED", note: "پرداخت توسط کاربر لغو شد یا ناموفق بود" },
    });
    return back("failed", code);
  }

  // تأیید با درگاه (خارج از تراکنش دیتابیس چون درخواست شبکه‌ایه)
  const verified = await verifyGatewayPayment({ authority, amount: tx0.amount }).catch(() => ({ ok: false }));
  if (!verified.ok) {
    await prisma.transaction.updateMany({
      where: { id: tx0.id, status: "PENDING" },
      data: { status: "FAILED", note: "تأیید پرداخت توسط درگاه ناموفق بود" },
    });
    return back("failed", code);
  }

  const result = await prisma.$transaction(
    async (tx) => {
      await lockOrder(tx, tx0.orderId);
      const t = await tx.transaction.findUnique({ where: { id: tx0.id } });
      if (t.status === "SUCCESS") return "success";
      // پرداخت با موفقیت انجام شده؛ حتی اگه قبلاً «ناموفق» علامت خورده بود (کاربر دوباره تلاش کرده یا سفارش لغو شده)
      await tx.transaction.update({
        where: { id: t.id },
        data: { status: "SUCCESS", reference: verified.refId || t.reference, note: "پرداخت از درگاه" },
      });
      const order = await tx.order.findUnique({ where: { id: tx0.orderId } });
      if (NOT_PAYABLE_STATUSES.includes(order.status)) {
        // سفارش در این فاصله لغو شده → پول به کیف پول برمی‌گرده تا هیچ مبلغی گم نشه
        await refundOrderToWallet(tx, order, { note: `برگشت وجه: پرداخت بعد از لغو سفارش ${order.code}` });
        return "refunded";
      }
      return "success";
    },
    { timeout: 20_000 },
  );

  return back(result, code);
}
