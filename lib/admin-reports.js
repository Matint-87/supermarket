// کوئری‌های گزارش‌های پنل مدیریت. تجمیع‌ها (جمع/تعداد به تفکیک روز) توی خود دیتابیس با SQL خام انجام می‌شه
// تا حتی با هزاران سفارش هم سنگین نشه. روزها به وقت تهران محاسبه می‌شن.
// «فروش معتبر» = سفارش‌هایی که لغو یا مرجوع نشدن.
import "server-only";
import { LOW_STOCK_THRESHOLD, REPORT_DEFAULT_DAYS, REPORT_RANGES } from "@/lib/admin-constants";
import { paramString, fullName } from "@/lib/admin-dal";
import { dayBounds } from "@/lib/date-range";
import { prisma } from "@/lib/db";

const TZ = "Asia/Tehran";
// پارامتر شروع بازه به‌صورت رشته‌ی ISO (UTC) داده می‌شه و توی SQL به timestamp بدون منطقه (UTC) تبدیل می‌شه؛
// اینطوری نتیجه به منطقه‌ی زمانی سرور/درایور وابسته نیست و ایندکس created_at هم استفاده می‌شه.

// ستون created_at به UTC ذخیره می‌شه؛ اول UTC → بعد وقت تهران → رشته‌ی YYYY-MM-DD
const DAY = (col) => `to_char((${col} AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}', 'YYYY-MM-DD')`;

export function parseDays(sp) {
  const n = Number(paramString(sp?.days, 5));
  return REPORT_RANGES.some((r) => r.value === n) ? n : REPORT_DEFAULT_DAYS;
}

const addDays = (key, delta) => {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

/** کلید روزهای بازه (قدیمی → جدید) و لحظه‌ی شروع بازه به وقت تهران (ایران ساعت تابستانی ندارد: +۰۳:۳۰) */
export function dayRange(days) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const first = addDays(today, -(days - 1));
  const keys = Array.from({ length: days }, (_, i) => addDays(first, i));
  return { keys, since: new Date(`${first}T00:00:00+03:30`) };
}

/** ردیف‌های {day, ...} → آرایه‌ی هم‌طول با keys (روزهای بدون داده صفر) */
function fillDays(keys, rows, field) {
  const map = new Map(rows.map((r) => [r.day, Number(r[field] ?? 0)]));
  return keys.map((k) => map.get(k) ?? 0);
}

const sum = (arr) => arr.reduce((s, n) => s + n, 0);

// ───────────── گزارش فروش ─────────────
export async function salesReport(days) {
  const { keys, since } = dayRange(days);
  const [rows, totals, money] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT ${DAY("created_at")} AS day,
        COUNT(*) FILTER (WHERE status NOT IN ('CANCELED','RETURNED'))::int AS orders,
        COALESCE(SUM(payable) FILTER (WHERE status NOT IN ('CANCELED','RETURNED')), 0)::float8 AS revenue,
        COALESCE(SUM(payable) FILTER (WHERE status = 'DELIVERED'), 0)::float8 AS delivered,
        COALESCE(SUM(discount_total) FILTER (WHERE status NOT IN ('CANCELED','RETURNED')), 0)::float8 AS discount
       FROM orders WHERE created_at >= ($1::timestamptz AT TIME ZONE 'UTC') GROUP BY 1 ORDER BY 1`,
      since.toISOString(),
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'CANCELED')::int AS canceled,
        COUNT(*) FILTER (WHERE status = 'RETURNED')::int AS returned,
        COALESCE(SUM(payable) FILTER (WHERE status IN ('CANCELED','RETURNED')), 0)::float8 AS lost
       FROM orders WHERE created_at >= ($1::timestamptz AT TIME ZONE 'UTC')`,
      since.toISOString(),
    ),
    prisma.transaction.groupBy({
      by: ["type"],
      where: { status: "SUCCESS", createdAt: { gte: since } },
      _sum: { amount: true },
    }),
  ]);

  const revenueSeries = fillDays(keys, rows, "revenue");
  const ordersSeries = fillDays(keys, rows, "orders");
  const revenue = sum(revenueSeries);
  const orders = sum(ordersSeries);
  const t = totals[0] ?? {};
  const paid = money.find((m) => m.type === "PAYMENT")?._sum.amount ?? 0;
  const refunded = money.find((m) => m.type === "REFUND")?._sum.amount ?? 0;

  return {
    keys,
    revenueSeries,
    ordersSeries,
    revenue,
    orders,
    delivered: sum(fillDays(keys, rows, "delivered")),
    discount: sum(fillDays(keys, rows, "discount")),
    avgOrder: orders ? Math.round(revenue / orders) : 0,
    canceled: t.canceled ?? 0,
    returned: t.returned ?? 0,
    lost: Number(t.lost ?? 0),
    totalOrders: t.total ?? 0,
    paid,
    refunded,
  };
}

// ───────────── گزارش محصولات ─────────────
export async function productsReport(days) {
  const { since } = dayRange(days);
  const soldSql = (order) =>
    `SELECT oi.name AS name,
       SUM(oi.quantity)::int AS qty,
       SUM(oi.final_price * oi.quantity)::float8 AS revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at >= ($1::timestamptz AT TIME ZONE 'UTC') AND o.status NOT IN ('CANCELED','RETURNED')
     GROUP BY oi.name ORDER BY ${order} DESC, oi.name LIMIT 10`;

  const [byQty, byRevenue, byCategory, active, out, low, lowList] = await Promise.all([
    prisma.$queryRawUnsafe(soldSql("qty"), since.toISOString()),
    prisma.$queryRawUnsafe(soldSql("revenue"), since.toISOString()),
    prisma.$queryRawUnsafe(
      `SELECT COALESCE(c.name, 'بدون دسته') AS name,
         SUM(oi.quantity)::int AS qty,
         SUM(oi.final_price * oi.quantity)::float8 AS revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN products p ON p.id = oi.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE o.created_at >= ($1::timestamptz AT TIME ZONE 'UTC') AND o.status NOT IN ('CANCELED','RETURNED')
       GROUP BY 1 ORDER BY revenue DESC LIMIT 10`,
      since.toISOString(),
    ),
    prisma.product.count({ where: { isActive: true } }),
    prisma.product.count({ where: { isActive: true, stock: 0 } }),
    prisma.product.count({ where: { isActive: true, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } } }),
    prisma.product.findMany({
      where: { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } },
      orderBy: [{ stock: "asc" }, { name: "asc" }],
      take: 10,
      select: { id: true, name: true, stock: true },
    }),
  ]);

  const num = (rows) => rows.map((r) => ({ name: r.name, qty: Number(r.qty), revenue: Number(r.revenue) }));
  return { byQty: num(byQty), byRevenue: num(byRevenue), byCategory: num(byCategory), active, out, low, lowList };
}

// ───────────── گزارش کاربران ─────────────
export async function usersReport(days) {
  const { keys, since } = dayRange(days);
  const [rows, totalUsers, banned, buyers, top] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT ${DAY("created_at")} AS day, COUNT(*)::int AS users FROM users WHERE created_at >= ($1::timestamptz AT TIME ZONE 'UTC') GROUP BY 1 ORDER BY 1`,
      since.toISOString(),
    ),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: false } }),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(DISTINCT user_id)::int AS buyers FROM orders WHERE created_at >= ($1::timestamptz AT TIME ZONE 'UTC') AND status NOT IN ('CANCELED','RETURNED')`,
      since.toISOString(),
    ),
    prisma.$queryRawUnsafe(
      `SELECT u.id, u.first_name, u.last_name, u.phone,
         COUNT(*)::int AS orders, SUM(o.payable)::float8 AS spent
       FROM orders o JOIN users u ON u.id = o.user_id
       WHERE o.created_at >= ($1::timestamptz AT TIME ZONE 'UTC') AND o.status NOT IN ('CANCELED','RETURNED')
       GROUP BY u.id ORDER BY spent DESC LIMIT 10`,
      since.toISOString(),
    ),
  ]);

  const series = fillDays(keys, rows, "users");
  return {
    keys,
    series,
    newUsers: sum(series),
    totalUsers,
    banned,
    buyers: buyers[0]?.buyers ?? 0,
    top: top.map((r) => ({
      id: r.id,
      name: fullName({ firstName: r.first_name, lastName: r.last_name }) || "بدون نام",
      phone: r.phone,
      orders: Number(r.orders),
      spent: Number(r.spent),
    })),
  };
}

// ───────────── گزارش سفارش‌ها ─────────────
export async function ordersReport(days) {
  const { keys, since } = dayRange(days);
  const [daily, byStatus, byMethod, byHour] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT ${DAY("created_at")} AS day, COUNT(*)::int AS orders FROM orders WHERE created_at >= ($1::timestamptz AT TIME ZONE 'UTC') GROUP BY 1 ORDER BY 1`,
      since.toISOString(),
    ),
    prisma.$queryRawUnsafe(`SELECT status::text AS key, COUNT(*)::int AS count FROM orders WHERE created_at >= ($1::timestamptz AT TIME ZONE 'UTC') GROUP BY 1`, since.toISOString()),
    prisma.$queryRawUnsafe(
      `SELECT shipping_method::text AS key, COUNT(*)::int AS count FROM orders WHERE created_at >= ($1::timestamptz AT TIME ZONE 'UTC') GROUP BY 1`,
      since.toISOString(),
    ),
    prisma.$queryRawUnsafe(
      `SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}')::int AS hour, COUNT(*)::int AS count
       FROM orders WHERE created_at >= ($1::timestamptz AT TIME ZONE 'UTC') GROUP BY 1`,
      since.toISOString(),
    ),
  ]);

  const series = fillDays(keys, daily, "orders");
  const hourMap = new Map(byHour.map((r) => [Number(r.hour), Number(r.count)]));
  const toMap = (rows) => Object.fromEntries(rows.map((r) => [r.key, Number(r.count)]));
  return {
    keys,
    series,
    total: sum(series),
    byStatus: toMap(byStatus),
    byMethod: toMap(byMethod),
    byHour: Array.from({ length: 24 }, (_, h) => hourMap.get(h) ?? 0),
  };
}

// ───────────── گزارش روزانه / بازه‌ی دلخواه (تاریخ شمسی انتخاب می‌شه؛ اینجا با کلید روز میلادی کار می‌کنیم) ─────────────
// «فروش معتبر» مثل بقیه‌ی گزارش‌ها = سفارش‌های لغو/مرجوع‌نشده، بر اساس تاریخ ثبت سفارش.
// «تحویل‌شده در بازه» بر اساس زمان تحویل (delivered_at) حساب می‌شه، نه زمان ثبت.
export async function periodReport(fromKey, toKey) {
  const { start, end } = dayBounds(fromKey, toKey);
  const a = start.toISOString();
  const b = end.toISOString();
  const keys = [];
  for (let k = fromKey; k <= toKey; k = addDays(k, 1)) keys.push(k);
  const WHERE = `created_at >= ($1::timestamptz AT TIME ZONE 'UTC') AND created_at < ($2::timestamptz AT TIME ZONE 'UTC')`;
  const OK = `status NOT IN ('CANCELED','RETURNED')`;

  const [daily, totals, byMethod, byHour, delivered, money, topProducts, recent] = await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT ${DAY("created_at")} AS day,
         COUNT(*) FILTER (WHERE ${OK})::int AS orders,
         COALESCE(SUM(payable) FILTER (WHERE ${OK}), 0)::float8 AS revenue
       FROM orders WHERE ${WHERE} GROUP BY 1 ORDER BY 1`,
      a,
      b,
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE ${OK})::int AS valid,
         COALESCE(SUM(payable) FILTER (WHERE ${OK}), 0)::float8 AS revenue,
         COALESCE(SUM(discount_total) FILTER (WHERE ${OK}), 0)::float8 AS discount,
         COALESCE(SUM(shipping_fee) FILTER (WHERE ${OK}), 0)::float8 AS shipping,
         COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending,
         COUNT(*) FILTER (WHERE status = 'PROCESSING')::int AS processing,
         COUNT(*) FILTER (WHERE status = 'SHIPPING')::int AS shipping_count,
         COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS delivered_now,
         COUNT(*) FILTER (WHERE status = 'CANCELED')::int AS canceled,
         COUNT(*) FILTER (WHERE status = 'RETURNED')::int AS returned,
         COALESCE(SUM(payable) FILTER (WHERE status IN ('CANCELED','RETURNED')), 0)::float8 AS lost
       FROM orders WHERE ${WHERE}`,
      a,
      b,
    ),
    prisma.$queryRawUnsafe(
      `SELECT shipping_method::text AS key, COUNT(*)::int AS count, COALESCE(SUM(payable), 0)::float8 AS revenue
       FROM orders WHERE ${WHERE} AND ${OK} GROUP BY 1`,
      a,
      b,
    ),
    prisma.$queryRawUnsafe(
      `SELECT EXTRACT(HOUR FROM (created_at AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}')::int AS hour, COUNT(*)::int AS count
       FROM orders WHERE ${WHERE} GROUP BY 1`,
      a,
      b,
    ),
    prisma.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count, COALESCE(SUM(payable), 0)::float8 AS revenue
       FROM orders WHERE status = 'DELIVERED'
         AND delivered_at >= ($1::timestamptz AT TIME ZONE 'UTC') AND delivered_at < ($2::timestamptz AT TIME ZONE 'UTC')`,
      a,
      b,
    ),
    prisma.transaction.groupBy({
      by: ["type", "method"],
      where: { status: "SUCCESS", createdAt: { gte: start, lt: end } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.$queryRawUnsafe(
      `SELECT oi.name AS name, SUM(oi.quantity)::int AS qty, SUM(oi.final_price * oi.quantity)::float8 AS revenue
       FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.created_at >= ($1::timestamptz AT TIME ZONE 'UTC') AND o.created_at < ($2::timestamptz AT TIME ZONE 'UTC')
         AND o.status NOT IN ('CANCELED','RETURNED')
       GROUP BY oi.name ORDER BY qty DESC, oi.name LIMIT 10`,
      a,
      b,
    ),
    prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 30,
      select: { id: true, code: true, status: true, payable: true, createdAt: true, shippingMethod: true, recipientName: true },
    }),
  ]);

  const t = totals[0] ?? {};
  const hourMap = new Map(byHour.map((r) => [Number(r.hour), Number(r.count)]));
  const revenueSeries = fillDays(keys, daily, "revenue");
  const ordersSeries = fillDays(keys, daily, "orders");
  const valid = t.valid ?? 0;
  const revenue = Number(t.revenue ?? 0);
  const moneySum = (type) => money.filter((m) => m.type === type).reduce((s, m) => s + (m._sum.amount ?? 0), 0);

  return {
    keys,
    revenueSeries,
    ordersSeries,
    byHour: Array.from({ length: 24 }, (_, h) => hourMap.get(h) ?? 0),
    totalOrders: t.total ?? 0,
    validOrders: valid,
    revenue,
    avgOrder: valid ? Math.round(revenue / valid) : 0,
    discount: Number(t.discount ?? 0),
    shippingFees: Number(t.shipping ?? 0),
    lost: Number(t.lost ?? 0),
    status: {
      PENDING: t.pending ?? 0,
      PROCESSING: t.processing ?? 0,
      SHIPPING: t.shipping_count ?? 0,
      DELIVERED: t.delivered_now ?? 0,
      CANCELED: t.canceled ?? 0,
      RETURNED: t.returned ?? 0,
    },
    byMethod: byMethod.map((r) => ({ key: r.key, count: Number(r.count), revenue: Number(r.revenue) })),
    deliveredInPeriod: { count: Number(delivered[0]?.count ?? 0), revenue: Number(delivered[0]?.revenue ?? 0) },
    paid: moneySum("PAYMENT"),
    refunded: moneySum("REFUND"),
    paidByMethod: money
      .filter((m) => m.type === "PAYMENT")
      .map((m) => ({ method: m.method, amount: m._sum.amount ?? 0, count: m._count._all }))
      .sort((x, y) => y.amount - x.amount),
    topProducts: topProducts.map((r) => ({ name: r.name, qty: Number(r.qty), revenue: Number(r.revenue) })),
    recent: recent.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
  };
}
