// ابزارهای مشترک نمودارهای Recharts پنل مدیریت (کلاینتی؛ بدون وابستگی سمت سرور)
import { formatNumber } from "@/lib/format";
import { formatJalaliDayKey } from "@/lib/jalali";

/**
 * رنگ هر «tone» از متغیرهای CSS پالت می‌آد (green-* همون رنگ برند فعاله)،
 * پس با عوض‌کردن پالت سایت یا دارک‌مود، نمودارها هم خودکار عوض می‌شن.
 */
export const CHART_TONES = {
  green: "var(--color-green-500, #4d85af)",
  sky: "var(--color-sky-500, #0ea5e9)",
  amber: "var(--color-amber-500, #f59e0b)",
  violet: "var(--color-violet-500, #8b5cf6)",
  red: "var(--color-red-400, #f87171)",
};

/** رنگ‌های ثابت محور/خطوط راهنما (با fallback، چون Tailwind متغیر استفاده‌نشده رو توی CSS نمی‌ذاره) */
export const AXIS_COLOR = "var(--color-slate-400, #94a3b8)";
export const GRID_COLOR = "var(--color-slate-200, #e2e8f0)";

export const toneColor = (tone) => CHART_TONES[tone] ?? CHART_TONES.green;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
export const hourText = (h) => `${String(h).padStart(2, "0")}:۰۰`.replace(/\d/g, (x) => FA_DIGITS[x]);

/** عدد بزرگ → فشرده برای محور (۱٫۲ میلیون) */
const compact = new Intl.NumberFormat("fa-IR", { notation: "compact", maximumFractionDigits: 1 });
export const formatAxisNumber = (v) => (Math.abs(v) >= 10000 ? compact.format(v) : formatNumber(v));

/** keys/values موازی → آرایه‌ی داده‌ی Recharts */
export function buildDaySeries(keys, values, hourLabels) {
  return values.map((value, i) => ({
    key: keys[i],
    value,
    label: hourLabels ? hourText(i) : formatJalaliDayKey(keys[i]),
    full: hourLabels ? `ساعت ${hourText(i)}` : formatJalaliDayKey(keys[i]),
  }));
}
