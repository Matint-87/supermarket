// کوئری‌های لیست‌های پنل مدیریت با pagination مبتنی بر cursor (برای لود تنبل ۱۰تا۱۰تا).
// هم صفحه‌های سرور (برای رندر اولیه‌ی ۱۰ آیتم اول) و هم Route Handlerهای /api/admin/* از همین‌جا استفاده می‌کنن
// تا شرط‌های فیلتر و مرتب‌سازی فقط یک‌جا نوشته بشن و صفحه‌ی اول و صفحه‌های بعدی هیچ‌وقت با هم اختلاف پیدا نکنن.
import "server-only";
import {
  ACTIVITY_ACTION_VALUES,
  ACTIVITY_ENTITY_VALUES,
  ADMIN_LOAD_SIZE,
  LOW_STOCK_THRESHOLD,
  ORDER_STATUS_VALUES,
  PAYMENT_METHOD_VALUES,
  USER_ORDERS_PAGE_SIZES,
  TRANSACTION_STATUS_VALUES,
  TRANSACTION_TYPE_VALUES,
} from "@/lib/admin-constants";
import { fullName, paramEnum, paramString, searchTerms, toAdminUser } from "@/lib/admin-dal";
import { toPublicBrand, toPublicCategory, toPublicCourier, toPublicOrder, toPublicProduct, toPublicZone } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { moneyByOrder, publicPayment } from "@/lib/finance";
import { toEnglishDigits } from "@/lib/phone";
import { dayBounds, parseDayRange } from "@/lib/date-range";
import { productSearchWhere } from "@/lib/product-search";
import { SHIPPING_METHOD_VALUES } from "@/lib/shipping";
import { uuidSchema } from "@/lib/schemas";

/** cursor باید UUID معتبر باشه؛ وگرنه نادیده گرفته می‌شه (اولین صفحه) */
export function parseCursor(value) {
  const v = paramString(value, 60);
  return uuidSchema.safeParse(v).success ? v : null;
}

/**
 * یک صفحه‌ی ۱۰تایی می‌خونه. یک ردیف اضافه می‌گیریم تا بفهمیم صفحه‌ی بعدی هست یا نه
 * (بدون count اضافه). total فقط برای اولین صفحه (بدون cursor) حساب می‌شه.
 */
async function pageOf({ delegate, where, orderBy, include, cursor, map }) {
  const [rows, total] = await Promise.all([
    delegate.findMany({
      where,
      orderBy,
      ...(include && { include }),
      take: ADMIN_LOAD_SIZE + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    cursor ? Promise.resolve(null) : delegate.count({ where }),
  ]);
  const hasMore = rows.length > ADMIN_LOAD_SIZE;
  const items = hasMore ? rows.slice(0, ADMIN_LOAD_SIZE) : rows;
  return {
    items: items.map(map),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    total,
  };
}

// ───────────── کاربران ─────────────
export function parseUserFilters(sp) {
  return {
    q: paramString(sp?.q),
    role: paramEnum(sp?.role, ["USER", "ADMIN"]),
    status: paramEnum(sp?.status, ["active", "banned"]),
  };
}

export function fetchUsersPage(filters, cursor = null) {
  const terms = searchTerms(filters.q);
  const where = {
    ...(filters.role && { role: filters.role }),
    ...(filters.status === "active" && { isActive: true }),
    ...(filters.status === "banned" && { isActive: false }),
    ...(terms.length && {
      // هر کلمه باید جایی (نام، فامیل، موبایل یا ایمیل) پیدا بشه
      AND: terms.map((t) => ({
        OR: [
          { phone: { contains: toEnglishDigits(t) } },
          { firstName: { contains: t, mode: "insensitive" } },
          { lastName: { contains: t, mode: "insensitive" } },
          { email: { contains: t, mode: "insensitive" } },
        ],
      })),
    }),
  };
  return pageOf({
    delegate: prisma.user,
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { _count: { select: { orders: true } } },
    cursor,
    map: toAdminUser,
  });
}

// ───────────── سفارش‌ها ─────────────
export function parseOrderFilters(sp) {
  return {
    q: paramString(sp?.q),
    status: paramEnum(sp?.status, ORDER_STATUS_VALUES),
    shipping: paramEnum(sp?.shipping, SHIPPING_METHOD_VALUES),
    // بازه‌ی تاریخ ثبت سفارش (کلید روز میلادی به وقت تهران؛ در UI شمسی انتخاب می‌شه)
    ...parseDayRange(sp),
  };
}

export async function fetchOrdersPage(filters, cursor = null) {
  const terms = searchTerms(filters.q);
  const range = filters.from && filters.to ? dayBounds(filters.from, filters.to) : null;
  const where = {
    ...(filters.status && { status: filters.status }),
    ...(filters.shipping && { shippingMethod: filters.shipping }),
    ...(range && { createdAt: { gte: range.start, lt: range.end } }),
    ...(terms.length && {
      // جست‌وجو روی کد سفارش یا نام/موبایل گیرنده
      AND: terms.map((t) => ({
        OR: [
          { code: { contains: toEnglishDigits(t) } },
          { recipientName: { contains: t, mode: "insensitive" } },
          { recipientPhone: { contains: toEnglishDigits(t) } },
        ],
      })),
    }),
  };
  const page = await pageOf({
    delegate: prisma.order,
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { user: true },
    cursor,
    map: (o) => ({ ...toPublicOrder(o), buyerName: fullName(o.user) || o.recipientName }),
  });
  // وضعیت پرداخت هر سفارش (یک کوئری برای کل صفحه)
  const money = await moneyByOrder(prisma, page.items.map((o) => o.id));
  return { ...page, items: page.items.map((o) => ({ ...o, payment: publicPayment(o, money.get(o.id)) })) };
}

/** پارامترهای لیست سفارش‌های یک کاربر: q (کد سفارش)، from/to (روز)، page، size */
export function parseUserOrdersParams(sp) {
  const { from, to } = parseDayRange(sp);
  const size = Number(paramString(sp?.size, 4));
  const page = Number.parseInt(paramString(sp?.page, 6), 10);
  return {
    q: toEnglishDigits(paramString(sp?.q, 20)),
    from,
    to,
    size: USER_ORDERS_PAGE_SIZES.includes(size) ? size : USER_ORDERS_PAGE_SIZES[0],
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/**
 * سفارش‌های یک کاربر برای صفحه‌ی جزئیات کاربر: جست‌وجو روی کد سفارش + فیلتر بازه‌ی روز + صفحه‌بندی شماره‌ای
 * (نه لود تنبل؛ برای کاربری که صدها سفارش داره صفحه سنگین و بی‌انتها نمی‌شه).
 */
export async function fetchUserOrdersPaged(userId, params) {
  const { q, from, to, size, page: wanted } = parseUserOrdersParams(params);
  const where = {
    userId,
    ...(q && { code: { contains: q } }),
    ...(from && to && { createdAt: (({ start, end }) => ({ gte: start, lt: end }))(dayBounds(from, to)) }),
  };
  const total = await prisma.order.count({ where });
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(wanted, pages);
  const rows = await prisma.order.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: size,
    skip: (page - 1) * size,
  });
  return { items: rows.map(toPublicOrder), total, page, pages, size };
}

// ───────────── محصولات ─────────────
export function parseProductFilters(sp) {
  const rawCategory = paramString(sp?.categoryId);
  return {
    q: paramString(sp?.q),
    status: paramEnum(sp?.status, ["active", "inactive", "low", "out"]),
    categoryId: uuidSchema.safeParse(rawCategory).success ? rawCategory : "",
  };
}

export function fetchProductsPage(filters, cursor = null) {
  const where = {
    ...(filters.categoryId && { categoryId: filters.categoryId }),
    ...(filters.status === "active" && { isActive: true }),
    ...(filters.status === "inactive" && { isActive: false }),
    ...(filters.status === "out" && { stock: 0 }),
    ...(filters.status === "low" && { stock: { lte: LOW_STOCK_THRESHOLD } }),
    ...productSearchWhere(filters.q),
  };
  return pageOf({
    delegate: prisma.product,
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { category: true, brand: true },
    cursor,
    map: toPublicProduct,
  });
}

// ───────────── دسته‌بندی‌ها ─────────────
export function fetchCategoriesPage(cursor = null) {
  return pageOf({
    delegate: prisma.category,
    where: {},
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    include: { _count: { select: { products: true } } },
    cursor,
    map: (c) => ({ ...toPublicCategory(c), productCount: c._count.products }),
  });
}

// ───────────── برندها ─────────────
export function fetchBrandsPage(cursor = null) {
  return pageOf({
    delegate: prisma.brand,
    where: {},
    orderBy: [{ name: "asc" }, { id: "asc" }],
    include: { _count: { select: { products: true } } },
    cursor,
    map: (b) => ({ ...toPublicBrand(b), productCount: b._count.products }),
  });
}

// ───────────── محدوده‌های ارسال ─────────────
export function fetchZonesPage(cursor = null) {
  return pageOf({
    delegate: prisma.shippingZone,
    where: {},
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    cursor,
    map: toPublicZone,
  });
}

// ───────────── پیک‌ها ─────────────
export function parseCourierFilters(sp) {
  return {
    q: paramString(sp?.q),
    status: paramEnum(sp?.status, ["active", "inactive"]),
  };
}

export function fetchCouriersPage(filters, cursor = null) {
  const terms = searchTerms(filters.q);
  const where = {
    ...(filters.status === "active" && { isActive: true }),
    ...(filters.status === "inactive" && { isActive: false }),
    ...(terms.length && {
      AND: terms.map((t) => ({
        OR: [{ name: { contains: t, mode: "insensitive" } }, { phone: { contains: toEnglishDigits(t) } }],
      })),
    }),
  };
  return pageOf({
    delegate: prisma.courier,
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    include: { _count: { select: { orders: true } } },
    cursor,
    map: (c) => ({ ...toPublicCourier(c), orderCount: c._count.orders }),
  });
}

// ───────────── آدرس‌های کاربران ─────────────
export function parseAddressFilters(sp) {
  return { q: paramString(sp?.q), province: paramString(sp?.province, 40) };
}

export function fetchAddressesPage(filters, cursor = null) {
  const terms = searchTerms(filters.q);
  const where = {
    ...(filters.province && { province: filters.province }),
    ...(terms.length && {
      AND: terms.map((t) => ({
        OR: [
          { recipientName: { contains: t, mode: "insensitive" } },
          { recipientPhone: { contains: toEnglishDigits(t) } },
          { city: { contains: t, mode: "insensitive" } },
          { addressLine: { contains: t, mode: "insensitive" } },
          { postalCode: { contains: toEnglishDigits(t) } },
          { user: { phone: { contains: toEnglishDigits(t) } } },
          { user: { firstName: { contains: t, mode: "insensitive" } } },
          { user: { lastName: { contains: t, mode: "insensitive" } } },
        ],
      })),
    }),
  };
  return pageOf({
    delegate: prisma.address,
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { user: true },
    cursor,
    map: (a) => ({
      id: a.id,
      label: a.label,
      recipientName: a.recipientName,
      recipientPhone: a.recipientPhone,
      province: a.province,
      city: a.city,
      neighborhood: a.neighborhood,
      addressLine: a.addressLine,
      plaque: a.plaque,
      unit: a.unit,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
      createdAt: a.createdAt.toISOString(),
      user: { id: a.user.id, name: fullName(a.user) || "بدون نام", phone: a.user.phone },
    }),
  });
}

// ───────────── تراکنش‌های مالی ─────────────
export function parseTransactionFilters(sp, forcedType = "") {
  return {
    q: paramString(sp?.q),
    type: forcedType || paramEnum(sp?.type, TRANSACTION_TYPE_VALUES),
    status: paramEnum(sp?.status, TRANSACTION_STATUS_VALUES),
    method: paramEnum(sp?.method, PAYMENT_METHOD_VALUES),
  };
}

export function toAdminTransaction(t) {
  return {
    id: t.id,
    type: t.type,
    status: t.status,
    method: t.method,
    amount: t.amount,
    reference: t.reference,
    note: t.note,
    createdAt: t.createdAt.toISOString(),
    orderCode: t.order.code,
    orderPayable: t.order.payable,
    user: { id: t.user.id, name: fullName(t.user) || t.order.recipientName, phone: t.user.phone },
  };
}

export function fetchTransactionsPage(filters, cursor = null) {
  const terms = searchTerms(filters.q);
  const where = {
    ...(filters.type && { type: filters.type }),
    ...(filters.status && { status: filters.status }),
    ...(filters.method && { method: filters.method }),
    ...(terms.length && {
      AND: terms.map((t) => ({
        OR: [
          { order: { code: { contains: toEnglishDigits(t) } } },
          { reference: { contains: t, mode: "insensitive" } },
          { user: { phone: { contains: toEnglishDigits(t) } } },
          { user: { firstName: { contains: t, mode: "insensitive" } } },
          { user: { lastName: { contains: t, mode: "insensitive" } } },
        ],
      })),
    }),
  };
  return pageOf({
    delegate: prisma.transaction,
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { order: true, user: true },
    cursor,
    map: toAdminTransaction,
  });
}

// ───────────── لاگ فعالیت‌ها ─────────────
export function parseActivityFilters(sp) {
  return {
    q: paramString(sp?.q),
    entity: paramEnum(sp?.entity, ACTIVITY_ENTITY_VALUES),
    action: paramEnum(sp?.action, ACTIVITY_ACTION_VALUES),
  };
}

export function fetchActivityPage(filters, cursor = null) {
  const terms = searchTerms(filters.q);
  const where = {
    ...(filters.entity && { entity: filters.entity }),
    ...(filters.action && { action: filters.action }),
    ...(terms.length && {
      AND: terms.map((t) => ({
        OR: [
          { summary: { contains: t, mode: "insensitive" } },
          { adminName: { contains: t, mode: "insensitive" } },
          { ip: { contains: toEnglishDigits(t) } },
        ],
      })),
    }),
  };
  return pageOf({
    delegate: prisma.activityLog,
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    cursor,
    map: (l) => ({
      id: l.id,
      adminId: l.adminId,
      adminName: l.adminName,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      summary: l.summary,
      ip: l.ip,
      createdAt: l.createdAt.toISOString(),
    }),
  });
}
