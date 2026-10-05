import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser, toPublicOrder } from "@/lib/dal";
import { moneyByOrder, publicPayment } from "@/lib/finance";
import { cancelOrder } from "@/lib/order-cancel";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { orderCancelSchema } from "@/lib/schemas";

/**
 * لغو سفارش توسط خود مشتری (فقط تا قبل از شروع آماده‌سازی) — دلیل لغو اجباریه.
 * هر مبلغی که برای این سفارش پرداخت شده بود خودکار به کیف پول مشتری برمی‌گرده.
 */
export const POST = handler(async (request, { params }) => {
  const user = await requireApiUser();
  const { code } = await params;
  if (!/^\d{8}$/.test(code)) throw new ApiError(400, "کد سفارش نامعتبر است");
  await rateLimit(`cancel:${user.id}`, 20, 60 * 60);
  const { reason } = orderCancelSchema.parse(await readJson(request));

  const { order, refunded } = await cancelOrder({ code, actor: "USER", reason, userId: user.id });

  const money = await moneyByOrder(prisma, [order.id]);
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { walletBalance: true } });
  return ok({
    order: { ...toPublicOrder(order), payment: publicPayment(order, money.get(order.id)) },
    refunded,
    walletBalance: fresh?.walletBalance ?? 0,
  });
});
