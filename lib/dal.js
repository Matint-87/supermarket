// لایه‌ی دسترسی به کاربر جاری (Data Access Layer).
// بررسی «واقعی» احراز هویت اینجاست (با دیتابیس)؛ proxy.js فقط یه چک سریع و خوش‌بینانه‌ست.
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { readSessionCookie } from "@/lib/session";
import { verifySessionToken } from "@/lib/token";
import { UNIT_LABELS, finalPriceOf } from "@/lib/product-constants";

/**
 * کاربر جاری رو برمی‌گردونه یا null.
 * علاوه بر امضای JWT این‌ها هم چک می‌شه: کاربر وجود داره، بن نشده، و tokenVersion هنوز همونه
 * (با تغییر رمز یا «خروج از همه‌ی دستگاه‌ها» توکن‌های قدیمی باطل می‌شن).
 */
export const getCurrentUser = cache(async () => {
  const token = await readSessionCookie();
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.isActive || user.tokenVersion !== session.tv) return null;
  return user;
});

/** برای Server Componentها: اگه وارد نشده باشه به صفحه‌ی ورود می‌فرسته */
export async function requireUser({ next } = {}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login");
  }
  return user;
}

/** فقط ادمین؛ کاربر عادی به صفحه‌ی اصلی برمی‌گرده */
export async function requireAdmin() {
  const user = await requireUser({ next: "/admin" });
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** برای Route Handlerها: به‌جای redirect خطای 401/403 پرتاب می‌کنه */
export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "برای ادامه باید وارد حساب کاربری شوید");
  return user;
}

export async function requireApiAdmin() {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") throw new ApiError(403, "دسترسی مجاز نیست");
  return user;
}

/**
 * آیا حساب کاربری کاملاً تکمیل شده؟ (هم اطلاعات شخصی، هم حداقل یک آدرس)
 * برای رفرش‌کردن claim «pc» توی سشن، هر جا این وضعیت ممکنه عوض بشه صدا زده می‌شه.
 */
export async function isOnboarded(user) {
  if (!user.profileCompletedAt) return false;
  const count = await prisma.address.count({ where: { userId: user.id } });
  return count > 0;
}

/** فقط فیلدهایی که مجازه به مرورگر برسه (هیچ‌وقت passwordHash و ... نه) */
export function toPublicUser(user) {
  return {
    id: user.id,
    phone: user.phone,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    nationalCode: user.nationalCode,
    birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : null,
    gender: user.gender,
    smsPromoOptIn: user.smsPromoOptIn,
    walletBalance: user.walletBalance ?? 0,
    hasPassword: Boolean(user.passwordHash),
    profileCompleted: Boolean(user.profileCompletedAt),
    createdAt: user.createdAt.toISOString(),
  };
}

export function toPublicCategory(c) {
  return {
    id: c.id,
    name: c.name,
    imageUrl: c.imageUrl ?? null,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
  };
}

export function toPublicBrand(b) {
  return {
    id: b.id,
    name: b.name,
    imageUrl: b.imageUrl ?? null,
    isActive: b.isActive,
  };
}

export function toPublicBanner(b) {
  return {
    id: b.id,
    title: b.title,
    imageUrl: b.imageUrl,
    linkUrl: b.linkUrl ?? null,
    sortOrder: b.sortOrder,
    isActive: b.isActive,
  };
}

export function toPublicZone(z) {
  return {
    id: z.id,
    name: z.name,
    province: z.province ?? null,
    cities: z.cities ?? [],
    fee: z.fee,
    freeOver: z.freeOver ?? null,
    deliveryTime: z.deliveryTime ?? null,
    isActive: z.isActive,
    sortOrder: z.sortOrder,
  };
}

export function toPublicCourier(c) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    vehicle: c.vehicle ?? null,
    isActive: c.isActive,
  };
}

/** قیمت نهایی بعد از تخفیف رو حساب می‌کنه و اطلاعات محصول رو برای کلاینت آماده می‌کنه */
export function toPublicProduct(p) {
  const finalPrice = finalPriceOf(p.price, p.discountPercent);
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? null,
    unit: p.unit,
    unitLabel: UNIT_LABELS[p.unit] ?? p.unit,
    amount: p.amount,
    price: p.price,
    discountPercent: p.discountPercent,
    finalPrice,
    stock: p.stock,
    imageUrl: p.imageUrl ?? null,
    isActive: p.isActive,
    category: p.category ? toPublicCategory(p.category) : { id: p.categoryId, name: null },
    brand: p.brand ? toPublicBrand(p.brand) : null,
    createdAt: p.createdAt.toISOString(),
  };
}

export function toPublicAddress(a) {
  return {
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
    latitude: a.latitude,
    longitude: a.longitude,
    isDefault: a.isDefault,
  };
}

/** سفارش (با آیتم‌ها) برای ارسال به مرورگر */
export function toPublicOrder(o) {
  return {
    id: o.id,
    code: o.code,
    status: o.status,
    shippingMethod: o.shippingMethod,
    itemsTotal: o.itemsTotal,
    discountTotal: o.discountTotal,
    shippingFee: o.shippingFee ?? 0,
    payable: o.payable,
    deliveryTime: o.deliveryTime ?? null,
    note: o.note ?? null,
    courierId: o.courierId ?? null,
    trackingCode: o.trackingCode ?? null,
    processingAt: o.processingAt ? o.processingAt.toISOString() : null,
    shippedAt: o.shippedAt ? o.shippedAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
    cancelReason: o.cancelReason ?? null,
    canceledAt: o.canceledAt ? o.canceledAt.toISOString() : null,
    canceledBy: o.canceledBy ?? null,
    createdAt: o.createdAt.toISOString(),
    address: {
      recipientName: o.recipientName,
      recipientPhone: o.recipientPhone,
      province: o.province,
      city: o.city,
      neighborhood: o.neighborhood,
      addressLine: o.addressLine,
      plaque: o.plaque,
      unit: o.unit,
      postalCode: o.postalCode,
    },
    items: (o.items ?? []).map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      imageUrl: i.imageUrl ?? null,
      unitLabel: i.unitLabel,
      unitPrice: i.unitPrice,
      discountPercent: i.discountPercent,
      finalPrice: i.finalPrice,
      quantity: i.quantity,
    })),
  };
}
