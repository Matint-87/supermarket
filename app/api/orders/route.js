import { randomInt } from "node:crypto";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser, toPublicOrder } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { moneyByOrder, publicPayment } from "@/lib/finance";
import { autoDeliverOverdue } from "@/lib/order-delivery";
import { announceNewOrder } from "@/lib/notify";
import { rateLimit } from "@/lib/rate-limit";
import { getStoreStatus } from "@/lib/settings";
import { quoteForMethod } from "@/lib/shipping-quote";
import { formatUnitAmount, finalPriceOf } from "@/lib/product-constants";
import { orderSchema, uuidSchema } from "@/lib/schemas";
import { isAddressComplete } from "@/lib/validators";

// هر تب پنل سفارش‌ها چند وضعیت رو کنار هم نشون می‌ده (همون TABS سمت کلاینت)
const ORDER_GROUPS = {
  CURRENT: ["PENDING", "PROCESSING", "SHIPPING"],
  DELIVERED: ["DELIVERED"],
  CANCELED: ["CANCELED"],
};
const ORDERS_PAGE_SIZE = 10;

/**
 * سفارش‌های کاربر جاری (جدیدترین اول) با pagination مبتنی بر cursor برای لود تنبل:
 * پارامترها: group (CURRENT | DELIVERED | CANCELED؛ بدون آن همه‌ی وضعیت‌ها)، cursor (id آخرین سفارش صفحه‌ی قبل)، limit (پیش‌فرض ۱۰، حداکثر ۳۰).
 * counts = تعداد کل سفارش‌های هر تب (برای نشان روی تب‌ها، مستقل از صفحه‌ای که لود شده) + وضعیت پرداخت هر سفارش + موجودی کیف پول
 */
export const GET = handler(async (request) => {
  const user = await requireApiUser();
  await autoDeliverOverdue(); // سفارش‌های ارسال‌شده‌ی طولانی → تحویل‌شده

  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group");
  const cursor = searchParams.get("cursor");
  if (group && !ORDER_GROUPS[group]) throw new ApiError(400, "گروه سفارش نامعتبر است");
  if (cursor && !uuidSchema.safeParse(cursor).success) throw new ApiError(400, "cursor نامعتبر است");
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || ORDERS_PAGE_SIZE, 1), 30);

  const rows = await prisma.order.findMany({
    where: { userId: user.id, ...(group && { status: { in: ORDER_GROUPS[group] } }) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: { items: true },
  });
  const hasMore = rows.length > limit;
  const orders = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? orders[orders.length - 1].id : null;

  // شمارنده‌ی تب‌ها فقط با اولین صفحه می‌آد (با صفحه‌های بعدی لازم نیست)
  let counts;
  if (!cursor) {
    const grouped = await prisma.order.groupBy({ by: ["status"], where: { userId: user.id }, _count: { _all: true } });
    const byStatus = new Map(grouped.map((g) => [g.status, g._count._all]));
    counts = Object.fromEntries(
      Object.entries(ORDER_GROUPS).map(([key, statuses]) => [key, statuses.reduce((sum, st) => sum + (byStatus.get(st) ?? 0), 0)]),
    );
  }

  const money = await moneyByOrder(prisma, orders.map((o) => o.id));
  return ok({
    orders: orders.map((o) => ({ ...toPublicOrder(o), payment: publicPayment(o, money.get(o.id)) })),
    nextCursor,
    ...(counts && { counts }),
    walletBalance: user.walletBalance,
  });
});

/**
 * ثبت سفارش از روی سبد خرید.
 * هیچ قیمتی از کلاینت پذیرفته نمی‌شه؛ فقط id و تعداد — قیمت و موجودی از دیتابیس خونده می‌شه.
 * کم‌کردن موجودی و ساخت سفارش توی یک تراکنش انجام می‌شه تا دو خریدار همزمان، موجودی رو منفی نکنن.
 */
export const POST = handler(async (request) => {
  const user = await requireApiUser();

  // فروشگاه بسته است → سفارش ثبت نمی‌شه (این چک سمت سرور اصلیه؛ مودال کلاینت فقط نمایشیه)
  const store = await getStoreStatus();
  if (!store.open) throw new ApiError(403, store.closedMessage, { code: "STORE_CLOSED" });

  await rateLimit(`order:${user.id}`, 10, 60 * 60, "تعداد سفارش‌های شما در این ساعت بیش از حد مجاز است.");

  const data = orderSchema.parse(await readJson(request));

  // ردیف‌های تکراری رو یکی کن
  const wanted = new Map();
  for (const it of data.items) {
    wanted.set(it.productId, (wanted.get(it.productId) ?? 0) + it.quantity);
  }

  const address = await prisma.address.findFirst({ where: { id: data.addressId, userId: user.id } });
  if (!address) throw new ApiError(400, "آدرس انتخاب‌شده معتبر نیست");
  if (!isAddressComplete(address)) {
    throw new ApiError(400, "آدرس انتخاب‌شده کامل نیست. آدرس را (همراه با کد پستی) تکمیل کنید.");
  }

  const products = await prisma.product.findMany({ where: { id: { in: [...wanted.keys()] } } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = [];
  for (const [productId, quantity] of wanted) {
    const p = byId.get(productId);
    if (!p || !p.isActive) {
      throw new ApiError(409, "یکی از کالاهای سبد دیگر عرضه نمی‌شود. سبد را بررسی کنید.", { code: "CART_CHANGED" });
    }
    if (p.stock < quantity) {
      throw new ApiError(
        409,
        p.stock > 0
          ? `موجودی «${p.name}» فقط ${p.stock.toLocaleString("fa-IR")} عدد است.`
          : `«${p.name}» ناموجود شده است.`,
        { code: "CART_CHANGED" },
      );
    }
    const finalPrice = finalPriceOf(p.price, p.discountPercent);
    lines.push({
      product: p,
      quantity,
      finalPrice,
      row: {
        productId: p.id,
        name: p.name,
        imageUrl: p.imageUrl,
        unitLabel: formatUnitAmount(p.amount, p.unit),
        unitPrice: p.price,
        discountPercent: p.discountPercent,
        finalPrice,
        quantity,
      },
    });
  }

  const itemsTotal = lines.reduce((s, l) => s + l.product.price * l.quantity, 0);
  const itemsPayable = lines.reduce((s, l) => s + l.finalPrice * l.quantity, 0);

  // هزینه و زمان ارسال از «محدوده‌ها/تنظیمات ارسال» پنل مدیریت — همیشه سمت سرور حساب می‌شه، نه از کلاینت
  const shipping = await quoteForMethod({
    method: data.shippingMethod,
    province: address.province,
    city: address.city,
    itemsPayable,
  });
  if (!shipping) throw new ApiError(400, "روش ارسال انتخاب‌شده در حال حاضر فعال نیست. روش دیگری را انتخاب کنید.");
  const shippingFee = shipping.fee;
  const payable = itemsPayable + shippingFee;

  // کد پیگیری ۸ رقمی؛ در (بسیار بعیدِ) برخورد با کد تکراری دوباره تلاش می‌کنیم
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(randomInt(10_000_000, 100_000_000));
    try {
      const order = await prisma.$transaction(async (tx) => {
        for (const l of lines) {
          const res = await tx.product.updateMany({
            where: { id: l.product.id, isActive: true, stock: { gte: l.quantity } },
            data: { stock: { decrement: l.quantity } },
          });
          if (res.count === 0) {
            throw new ApiError(409, `موجودی «${l.product.name}» تغییر کرد. سبد را بررسی کنید.`, {
              code: "CART_CHANGED",
            });
          }
        }
        return tx.order.create({
          data: {
            code,
            userId: user.id,
            shippingMethod: data.shippingMethod,
            itemsTotal,
            discountTotal: itemsTotal - itemsPayable,
            shippingFee,
            deliveryTime: shipping.deliveryTime,
            payable,
            note: data.note,
            recipientName: address.recipientName,
            recipientPhone: address.recipientPhone,
            province: address.province,
            city: address.city,
            neighborhood: address.neighborhood,
            addressLine: address.addressLine,
            plaque: address.plaque,
            unit: address.unit,
            postalCode: address.postalCode,
            latitude: address.latitude,
            longitude: address.longitude,
            items: { create: lines.map((l) => l.row) },
          },
          include: { items: true },
        });
      });
      // اعلان به ادمین‌ها: سفارش جدید + کم/تمام‌شدن موجودی (خطاش سفارش رو خراب نمی‌کنه)
      await announceNewOrder({
        order,
        user,
        lines: lines.map((l) => ({ productId: l.product.id, name: l.product.name, quantity: l.quantity })),
      });
      const payment = publicPayment(order, { paidSuccess: 0, paidPending: 0, refundSuccess: 0, refundPending: 0 });
      return ok({ order: { ...toPublicOrder(order), payment }, walletBalance: user.walletBalance }, { status: 201 });
    } catch (err) {
      if (err?.code === "P2002" && attempt < 4) continue;
      throw err;
    }
  }
  throw new ApiError(500, "ثبت سفارش انجام نشد. دوباره تلاش کنید.");
});
