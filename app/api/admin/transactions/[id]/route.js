import { ApiError, handler, ok, pickProvided, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { toAdminTransaction } from "@/lib/admin-queries";
import { TRANSACTION_STATUS_META } from "@/lib/admin-constants";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { lockOrder } from "@/lib/finance";
import { transactionUpdateSchema, uuidSchema } from "@/lib/schemas";
import { creditWallet } from "@/lib/wallet";

/**
 * تغییر وضعیت (فقط از «در انتظار» به «موفق» یا «ناموفق») و ویرایش شماره پیگیری/توضیحات.
 * مبلغ، نوع و سفارش بعد از ثبت قابل تغییر نیستن؛ برای اصلاح، تراکنش اشتباه «ناموفق» و تراکنش درست ثبت بشه.
 * تأیید («موفق») یک برگشت وجهِ «کیف پول» مبلغ رو به کیف پول کاربر اضافه می‌کنه.
 */
export const PATCH = handler(async (request, ctx) => {
  const admin = await requireApiAdmin();
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  const raw = await readJson(request);
  const data = pickProvided(raw, transactionUpdateSchema.parse(raw));

  const found = await prisma.transaction.findUnique({ where: { id }, select: { orderId: true } });
  if (!found) throw new ApiError(404, "تراکنش پیدا نشد");

  const { existing, updated, credited } = await prisma.$transaction(async (tx) => {
    await lockOrder(tx, found.orderId);
    // بعد از گرفتن قفل دوباره می‌خونیم تا وضعیتِ «در انتظار» هم‌زمان (مثلاً کال‌بک درگاه) عوض نشده باشه
    const existing = await tx.transaction.findUnique({ where: { id }, include: { order: true, user: true } });

    const statusChanged = data.status !== undefined && data.status !== existing.status;
    if (statusChanged && (existing.status !== "PENDING" || data.status === "PENDING")) {
      throw new ApiError(400, "فقط تراکنشِ «در انتظار» را می‌توان موفق یا ناموفق کرد");
    }
    if (
      statusChanged &&
      data.status === "SUCCESS" &&
      existing.type === "PAYMENT" &&
      ["CANCELED", "RETURNED"].includes(existing.order.status)
    ) {
      throw new ApiError(400, "این سفارش لغو شده؛ این پرداخت را «ناموفق» کنید و مبلغ را از راه دیگری به مشتری برگردانید");
    }

    const updated = await tx.transaction.update({ where: { id }, data, include: { order: true, user: true } });

    let credited = false;
    if (statusChanged && data.status === "SUCCESS" && existing.type === "REFUND" && existing.method === "WALLET") {
      await creditWallet(tx, {
        userId: existing.userId,
        amount: existing.amount,
        reason: "ORDER_REFUND",
        orderCode: existing.order.code,
        note: existing.note || `برگشت وجه سفارش ${existing.order.code}`,
        adminName: [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.phone,
      });
      credited = true;
    }
    return { existing, updated, credited };
  });

  const statusChanged = data.status !== undefined && data.status !== existing.status;
  await logActivity(admin, {
    action: statusChanged ? "STATUS" : "UPDATE",
    entity: "TRANSACTION",
    entityId: id,
    summary: statusChanged
      ? `تراکنش سفارش ${existing.order.code} به «${TRANSACTION_STATUS_META[data.status].label}» تغییر کرد${credited ? " و مبلغ به کیف پول کاربر واریز شد" : ""}`
      : `تراکنش سفارش ${existing.order.code} ویرایش شد`,
  });
  return ok({ transaction: toAdminTransaction(updated) });
});
