// بازه‌ی تاریخ فیلترها (سفارش‌ها و گزارش روزانه) — بدون import سمت‌سروری.
// تاریخ‌ها به‌صورت «کلید روز» (YYYY-MM-DD میلادی، به وقت تهران) توی URL نگه داشته می‌شن؛ کاربر شمسی می‌بینه.
// ایران ساعت تابستانی نداره (همیشه +۰۳:۳۰)؛ هماهنگ با lib/admin-reports.js.
import { isDayKey, shiftDayKey } from "@/lib/jalali";

/** حداکثر طول بازه (روز) تا کوئری‌های گزارش سنگین نشن */
export const MAX_RANGE_DAYS = 93;

/** { from, to } از searchParams؛ اگه یکی خالی باشه همون یکی برای هر دو سر بازه استفاده می‌شه. معتبر نبود → "" */
export function parseDayRange(sp) {
  const pick = (v) => {
    const s = Array.isArray(v) ? v[0] : v;
    return isDayKey(s) ? s : "";
  };
  let from = pick(sp?.from);
  let to = pick(sp?.to);
  if (from && !to) to = from;
  if (to && !from) from = to;
  if (from && to && from > to) [from, to] = [to, from];
  if (from && to) {
    const days = Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000) + 1;
    if (days > MAX_RANGE_DAYS) from = shiftDayKey(to, -(MAX_RANGE_DAYS - 1));
  }
  return { from, to };
}

/** [start, end) به‌صورت Date؛ end = آغاز روزِ بعد از «to» */
export function dayBounds(from, to) {
  return {
    start: new Date(`${from}T00:00:00+03:30`),
    end: new Date(`${shiftDayKey(to, 1)}T00:00:00+03:30`),
  };
}

export function daysBetween(from, to) {
  return Math.round((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000) + 1;
}
