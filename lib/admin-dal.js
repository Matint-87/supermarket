// کمک‌تابع‌های سمت‌سرور صفحه‌های پنل مدیریت (خوندن searchParams، تبدیل رکورد به JSON امن).
import "server-only";
import { normalizeText } from "@/lib/text";

/** مقدار searchParams ممکنه آرایه باشه؛ همیشه یک رشته‌ی تمیز برمی‌گردونه */
export function paramString(value, max = 100) {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** فقط مقدارهای مجاز رو قبول می‌کنه (وگرنه رشته‌ی خالی) */
export function paramEnum(value, allowed) {
  const v = paramString(value);
  return allowed.includes(v) ? v : "";
}

/** عبارت جست‌وجو → حداکثر ۴ کلمه (هر کلمه جداگانه روی فیلدها چک می‌شه) */
export function searchTerms(value) {
  return normalizeText(paramString(value)).split(" ").filter(Boolean).slice(0, 4);
}

const iso = (d) => (d ? new Date(d).toISOString() : null);

export function toAdminUser(u) {
  return {
    id: u.id,
    phone: u.phone,
    role: u.role,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    nationalCode: u.nationalCode,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    orderCount: u._count?.orders ?? 0,
    createdAt: iso(u.createdAt),
    lastLoginAt: iso(u.lastLoginAt),
  };
}

export function fullName(u) {
  return [u?.firstName, u?.lastName].filter(Boolean).join(" ");
}
