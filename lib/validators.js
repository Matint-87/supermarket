// اعتبارسنجی‌های مشترک بین کلاینت و سرور (هیچ import سمت‌سروری اینجا نباشه)
import { toEnglishDigits } from "./phone";

/** کد ملی ایران (با رقم کنترل) */
export function isValidNationalCode(input) {
  const code = toEnglishDigits(input).trim();
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false;
  const check = Number(code[9]);
  const sum = code
    .slice(0, 9)
    .split("")
    .reduce((acc, d, i) => acc + Number(d) * (10 - i), 0);
  const r = sum % 11;
  return r < 2 ? check === r : check === 11 - r;
}

/**
 * کد پستی ۱۰ رقمی ایران.
 * عمداً فقط ساختار پایه رو چک می‌کنه (۱۰ رقم، رقم اول غیرصفر، نه ۱۰ رقم یکسان). قاعده‌های سخت‌گیرانه‌تری که
 * توی اینترنت دست‌به‌دست می‌شن رو نتونستم از منبع رسمی تأیید کنم و خطاشون یعنی رد شدن مشتری واقعی.
 */
export function isValidPostalCode(input) {
  const code = toEnglishDigits(input).trim();
  return /^[1-9]\d{9}$/.test(code) && !/^(\d)\1{9}$/.test(code);
}

/** آدرس برای ثبت سفارش «کامل» هست؟ (گیرنده، استان، شهر، آدرس پستی و کد پستی معتبر) */
export function isAddressComplete(a) {
  return Boolean(
    a &&
      String(a.recipientName ?? "").trim() &&
      String(a.recipientPhone ?? "").trim() &&
      String(a.province ?? "").trim() &&
      String(a.city ?? "").trim() &&
      String(a.addressLine ?? "").trim().length >= 10 &&
      isValidPostalCode(a.postalCode ?? ""),
  );
}

export const NAME_REGEX = /^[\p{L}\u200c\s.'-]{2,50}$/u;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** حداقل ۸ کاراکتر، شامل حداقل یک حرف و یک عدد */
export function checkPassword(password, phone) {
  if (typeof password !== "string") return "رمز عبور معتبر نیست";
  if (password.length < 8) return "رمز عبور باید حداقل ۸ کاراکتر باشد";
  if (password.length > 100) return "رمز عبور بیش از حد طولانی است";
  if (!/\p{L}/u.test(password)) return "رمز عبور باید حداقل یک حرف داشته باشد";
  if (!/\d/.test(toEnglishDigits(password))) return "رمز عبور باید حداقل یک عدد داشته باشد";
  if (phone && toEnglishDigits(password).includes(phone)) return "رمز عبور نباید شماره موبایل شما باشد";
  return null;
}

/** فقط مسیرهای داخلی سایت رو قبول می‌کنه (جلوگیری از open redirect) */
export function safeNext(next, fallback = "/") {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}

// محدوده تقریبی جغرافیایی ایران — برای رد کردن مختصات بی‌معنی
export const IRAN_BOUNDS = { minLat: 24, maxLat: 40.5, minLng: 43.5, maxLng: 64 };

export function isInIran(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= IRAN_BOUNDS.minLat &&
    lat <= IRAN_BOUNDS.maxLat &&
    lng >= IRAN_BOUNDS.minLng &&
    lng <= IRAN_BOUNDS.maxLng
  );
}
