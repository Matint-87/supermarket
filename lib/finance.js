// قواعد مالی مشترک بین ثبت/ویرایش تراکنش‌ها: جمع پرداخت‌ها نباید از مبلغ سفارش بیشتر بشه
// و جمع برگشت وجه‌ها نباید از پرداخت‌های موفق بیشتر بشه.
import "server-only";
import { ApiError } from "@/lib/api";
import { formatToman } from "@/lib/format";
import { NOT_PAYABLE_STATUSES, paymentStatusOf } from "@/lib/order-constants";
import { creditWallet } from "@/lib/wallet";

/**
 * جمع مبلغ تراکنش‌های غیر‌ناموفق یک سفارش. `client` می‌تونه prisma یا tx باشه.
 * paidSuccess: پرداخت‌های موفق — paidActive: پرداخت‌های موفق + در انتظار — refundActive: برگشت‌های موفق + در انتظار
 */
export async function orderMoney(client, orderId) {
  const rows = await client.transaction.groupBy({
    by: ["type", "status"],
    where: { orderId, status: { not: "FAILED" } },
    _sum: { amount: true },
  });
  const sum = (type, status) => rows.find((r) => r.type === type && r.status === status)?._sum.amount ?? 0;
  const paidSuccess = sum("PAYMENT", "SUCCESS");
  const paidPending = sum("PAYMENT", "PENDING");
  const refundSuccess = sum("REFUND", "SUCCESS");
  const refundPending = sum("REFUND", "PENDING");
  return {
    paidSuccess,
    paidPending,
    paidActive: paidSuccess + paidPending,
    refundSuccess,
    refundActive: refundSuccess + refundPending,
  };
}

/** اگه تراکنش جدید با محدودیت‌ها نخونه، ApiError (با پیام فارسی) پرتاب می‌کنه */
export function assertTransactionFits({ type, amount }, money, payable) {
  if (type === "PAYMENT") {
    const remaining = Math.max(0, payable - money.paidActive);
    if (amount > remaining) {
      throw new ApiError(400, `مجموع پرداخت‌ها از مبلغ سفارش بیشتر می‌شود. مبلغ باقی‌مانده: ${formatToman(remaining)}`, {
        fields: { amount: `حداکثر ${formatToman(remaining)}` },
      });
    }
  } else {
    const refundable = Math.max(0, money.paidSuccess - money.refundActive);
    if (amount > refundable) {
      throw new ApiError(400, `مبلغ برگشت از پرداخت‌های موفق این سفارش بیشتر است. حداکثر قابل برگشت: ${formatToman(refundable)}`, {
        fields: { amount: `حداکثر ${formatToman(refundable)}` },
      });
    }
  }
}

/**
 * قفل ردیف سفارش تا پایان تراکنش (SELECT … FOR UPDATE).
 * همه‌ی عملیات پولیِ یک سفارش (پرداخت، کال‌بک درگاه، لغو، برگشت وجه) باید اول این رو بگیرن تا هم‌زمان
 * اجرا نشن (مثلاً لغو سفارش دقیقاً هم‌زمان با تأیید پرداخت درگاه).
 */
export async function lockOrder(tx, orderId) {
  await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
}

/** وضعیت پرداختِ چند سفارش با یک کوئری: Map<orderId, money> */
export async function moneyByOrder(client, orderIds) {
  const map = new Map(
    orderIds.map((id) => [id, { paidSuccess: 0, paidPending: 0, gatewayPending: 0, refundSuccess: 0, refundPending: 0 }]),
  );
  if (orderIds.length === 0) return map;
  const [rows, gateway] = await Promise.all([
    client.transaction.groupBy({
      by: ["orderId", "type", "status"],
      where: { orderId: { in: orderIds }, status: { not: "FAILED" } },
      _sum: { amount: true },
    }),
    // پرداخت‌های درگاهِ هنوز تأییدنشده (کاربر ممکنه نیمه‌کاره ول کرده باشه)
    client.transaction.groupBy({
      by: ["orderId"],
      where: { orderId: { in: orderIds }, type: "PAYMENT", status: "PENDING", authority: { not: null } },
      _sum: { amount: true },
    }),
  ]);
  for (const g of gateway) {
    const m = map.get(g.orderId);
    if (m) m.gatewayPending = g._sum.amount ?? 0;
  }
  for (const r of rows) {
    const m = map.get(r.orderId);
    if (!m) continue;
    const amount = r._sum.amount ?? 0;
    if (r.type === "PAYMENT") m[r.status === "SUCCESS" ? "paidSuccess" : "paidPending"] += amount;
    else m[r.status === "SUCCESS" ? "refundSuccess" : "refundPending"] += amount;
  }
  return map;
}

/**
 * هر مبلغی که برای سفارش پرداخت شده و هنوز برگشت نخورده رو به کیف پول کاربر برمی‌گردونه
 * (یک تراکنش «برگشت وجه / کیف پول / موفق» + یک ردیف در دفتر کیف پول). مبلغ برگشتی رو برمی‌گردونه (۰ = چیزی نبود).
 * باید داخل prisma.$transaction و بعد از lockOrder صدا زده بشه.
 */
export async function refundOrderToWallet(tx, order, { note }) {
  const money = await orderMoney(tx, order.id);
  const refundable = Math.max(0, money.paidSuccess - money.refundActive);
  if (refundable === 0) return 0;
  await tx.transaction.create({
    data: {
      type: "REFUND",
      status: "SUCCESS",
      method: "WALLET",
      amount: refundable,
      orderId: order.id,
      userId: order.userId,
      note,
    },
  });
  await creditWallet(tx, {
    userId: order.userId,
    amount: refundable,
    reason: "ORDER_REFUND",
    orderCode: order.code,
    note,
  });
  return refundable;
}

/**
 * وضعیت پرداخت برای نمایش به مشتری. پرداخت درگاهِ تأییدنشده «پرداخت‌شده» حساب نمی‌شه تا مشتری بتونه دوباره پرداخت کنه
 * (تلاش قبلی موقع پرداخت جدید خودکار ناموفق می‌شه)؛ فقط پرداخت‌های «در انتظار»ِ ثبت‌شده توسط مدیر مانع پرداخت می‌شن.
 */
export function publicPayment(order, money) {
  const manualPending = Math.max(0, (money.paidPending ?? 0) - (money.gatewayPending ?? 0));
  const remaining = Math.max(0, order.payable - money.paidSuccess - manualPending);
  return {
    status: paymentStatusOf(order, { paidSuccess: money.paidSuccess, paidPending: manualPending }),
    paid: money.paidSuccess,
    refunded: money.refundSuccess,
    remaining,
    awaitingConfirmation: manualPending > 0,
    canPay: remaining > 0 && !NOT_PAYABLE_STATUSES.includes(order.status),
  };
}
