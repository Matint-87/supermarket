// لغو سفارش (توسط مشتری یا مدیر) — همه‌ی کارها داخل یک تراکنش دیتابیس انجام می‌شه:
//   ۱) وضعیت → «لغو شده» + ثبت دلیل/زمان/لغوکننده
//   ۲) برگشت کالاها به موجودی انبار
//   ۳) پرداخت‌های «در انتظار» (درگاهِ نیمه‌کاره) ناموفق می‌شن
//   ۴) هر مبلغی که پرداخت شده بوده به کیف پول کاربر برمی‌گرده
import "server-only";
import { ApiError } from "@/lib/api";
import { RESTOCK_STATUSES } from "@/lib/admin-constants";
import { lockOrder, refundOrderToWallet } from "@/lib/finance";
import { USER_CANCELABLE_STATUSES } from "@/lib/order-constants";
import { prisma } from "@/lib/db";
import { announceOrderCanceled } from "@/lib/notify";

/**
 * @param {{code: string, actor: "USER"|"ADMIN", reason: string, userId?: string}} args
 *   userId فقط برای actor=USER لازمه (مشتری فقط سفارش خودش رو می‌تونه لغو کنه)
 * @returns {Promise<{order: object, refunded: number, previousStatus: string}>}
 */
export async function cancelOrder({ code, actor, reason, userId }) {
  const found = await prisma.order.findUnique({ where: { code }, select: { id: true, userId: true } });
  if (!found || (actor === "USER" && found.userId !== userId)) throw new ApiError(404, "سفارش پیدا نشد");

  const result = await prisma.$transaction(
    async (tx) => {
      await lockOrder(tx, found.id);
      const order = await tx.order.findUnique({ where: { id: found.id }, include: { items: true } });

      if (order.status === "CANCELED") throw new ApiError(409, "این سفارش قبلاً لغو شده است");
      if (actor === "USER" && !USER_CANCELABLE_STATUSES.includes(order.status)) {
        throw new ApiError(409, "این سفارش دیگر قابل لغو نیست؛ برای لغو با پشتیبانی تماس بگیرید");
      }

      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELED", cancelReason: reason, canceledAt: new Date(), canceledBy: actor },
      });

      // کالاها فقط یک‌بار به انبار برمی‌گردن (سفارشِ مرجوع‌شده قبلاً برگشته)
      if (!RESTOCK_STATUSES.includes(order.status)) {
        for (const item of order.items) {
          if (!item.productId) continue; // محصول بعداً حذف شده
          await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }

      // پرداخت‌های درگاهِ نیمه‌کاره دیگه معنی ندارن (اگه درگاه بعداً تأیید کنه، کال‌بک مبلغ رو به کیف پول می‌ریزه)
      await tx.transaction.updateMany({
        where: { orderId: order.id, type: "PAYMENT", status: "PENDING" },
        data: { status: "FAILED", note: "لغو سفارش" },
      });

      const refunded = await refundOrderToWallet(tx, order, {
        note: `برگشت وجه بابت لغو سفارش ${order.code}`,
      });

      const updated = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
      return { order: updated, refunded, previousStatus: order.status };
    },
    { timeout: 20_000 },
  );

  // لغو توسط مشتری → اعلان به ادمین‌ها؛ لغو توسط ادمین → اعلان به مشتری
  await announceOrderCanceled({ order: result.order, actor, refunded: result.refunded });
  return result;
}
