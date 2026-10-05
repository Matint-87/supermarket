// تبدیل تاریخ شمسی ⇄ میلادی برای فرم تاریخ تولد (دیتابیس میلادی نگه می‌داره، کاربر شمسی می‌بینه)
import {
  isValidJalaaliDate,
  jalaaliMonthLength as jalaaliMonthLengthRaw,
  toGregorian,
  toJalaali,
} from "jalaali-js";

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export function currentJalaliYear() {
  const d = new Date();
  return toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate()).jy;
}

/** "1990-05-14" → { y: "1369", m: "2", d: "24" } (رشته‌ها؛ خالی اگه تاریخی نباشه) */
export function isoToJalali(iso) {
  if (!iso) return { y: "", m: "", d: "" };
  const [gy, gm, gd] = iso.split("-").map(Number);
  const { jy, jm, jd } = toJalaali(gy, gm, gd);
  return { y: String(jy), m: String(jm), d: String(jd) };
}

/** شمسی → "YYYY-MM-DD" میلادی، یا null اگه تاریخ معتبر نباشه */
export function jalaliToIso(y, m, d) {
  const jy = Number(y), jm = Number(m), jd = Number(d);
  if (!isValidJalaaliDate(jy, jm, jd)) return null;
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export function jalaliMonthLength(y, m) {
  if (!y || !m) return 31;
  return jalaaliMonthLengthRaw(Number(y), Number(m));
}

/** تاریخ ISO/Date → «۱۴ دی ۱۴۰۴» (برای نمایش تاریخ سفارش‌ها) */
export function formatJalaliDate(input) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const { jy, jm, jd } = toJalaali(d.getFullYear(), d.getMonth() + 1, d.getDate());
  return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`.replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[x]);
}

/**
 * تاریخ و ساعت به وقت تهران: «۱۴ دی ۱۴۰۴ — ۱۴:۳۰»
 * (منطقه‌ی زمانی صریح داده شده تا رندر سمت سرور با UTC بودن سرور، تاریخ رو جابه‌جا نکنه)
 */
export function formatJalaliDateTime(input, timeZone = "Asia/Tehran") {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t) => Number(parts.find((p) => p.type === t)?.value);
  const { jy, jm, jd } = toJalaali(get("year"), get("month"), get("day"));
  const hh = String(get("hour")).padStart(2, "0");
  const mm = String(get("minute")).padStart(2, "0");
  return `${jd} ${JALALI_MONTHS[jm - 1]} ${jy} — ${hh}:${mm}`.replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[x]);
}

/** کلید روز «2026-09-30» (به وقت تهران) → «۸ مهر» برای برچسب نمودارها */
export function formatJalaliDayKey(key) {
  const [gy, gm, gd] = String(key).split("-").map(Number);
  if (!gy || !gm || !gd) return "";
  const { jm, jd } = toJalaali(gy, gm, gd);
  return `${jd} ${JALALI_MONTHS[jm - 1]}`.replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[x]);
}

// ───────────── کلید روز («YYYY-MM-DD» میلادی به وقت تهران) — برای فیلتر تاریخ سفارش‌ها و گزارش‌ها ─────────────

const FA = (s) => String(s).replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[x]);

/** کلید روزِ «امروز» به وقت تهران */
export function tehranTodayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());
}

/** آیا رشته یک کلید روزِ معتبر («2026-09-30») هست؟ */
export function isDayKey(v) {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** جابه‌جایی کلید روز به‌اندازه‌ی delta روز */
export function shiftDayKey(key, delta) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** کلید روز → «۸ مهر ۱۴۰۵» */
export function formatJalaliKey(key) {
  if (!isDayKey(key)) return "";
  const [gy, gm, gd] = key.split("-").map(Number);
  const { jy, jm, jd } = toJalaali(gy, gm, gd);
  return FA(`${jd} ${JALALI_MONTHS[jm - 1]} ${jy}`);
}

/** کلید روز → { y, m, d } شمسی (رشته‌ها؛ خالی اگه کلید معتبر نباشه) */
export function dayKeyToJalali(key) {
  return isDayKey(key) ? isoToJalali(key) : { y: "", m: "", d: "" };
}

/** سال‌/ماه/روز شمسی → کلید روز میلادی یا "" */
export function jalaliToDayKey(y, m, d) {
  return jalaliToIso(y, m, d) ?? "";
}
