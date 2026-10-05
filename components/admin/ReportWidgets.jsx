// اجزای آمار و نمودار گزارش‌ها (سرور کامپوننت؛ نمودارها با Recharts و از طریق LazyChart لود تنبل می‌شن)
import Link from "next/link";
import { REPORT_RANGES } from "@/lib/admin-constants";
import { formatNumber } from "@/lib/format";
import { LazyDayChart, LazyHBarChart } from "@/components/admin/charts/LazyChart";

const TONES = {
  green: { tile: "bg-green-50 text-green-700" },
  sky: { tile: "bg-sky-50 text-sky-600" },
  amber: { tile: "bg-amber-50 text-amber-600" },
  violet: { tile: "bg-violet-50 text-violet-600" },
  red: { tile: "bg-red-50 text-red-600" },
};

/** تب‌های انتخاب بازه‌ی زمانی (۷ / ۳۰ / ۹۰ روز) */
export function RangeTabs({ basePath, days }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-xs">
      {REPORT_RANGES.map((r) => (
        <Link
          key={r.value}
          href={`${basePath}?days=${r.value}`}
          scroll={false}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${
            r.value === days ? "bg-white text-green-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
          }`}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}

export function StatTile({ label, value, hint, tone = "green", icon: Icon }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-2 truncate text-lg font-extrabold sm:text-xl tracking-tight text-slate-800">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
      {Icon && (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone].tile}`}>
          <Icon size={17} />
        </span>
      )}
    </div>
  );
}

/**
 * نمودار روزانه (قدیمی‌ترین روز سمت راست، چون صفحه راست‌به‌چپ است) — با Recharts و لود تنبل.
 * `format` عمداً نداریم: تابع نمی‌تونه از سرور کامپوننت به کلاینت پاس داده بشه؛ نمودار خودش عدد فارسی نشون می‌ده.
 */
export function DayBars({ keys, values, tone = "green", unit = "", hourLabels = false }) {
  if (Math.max(...values, 0) === 0) return <p className="py-10 text-center text-xs text-slate-400">در این بازه داده‌ای ثبت نشده.</p>;
  const max = Math.max(...values);

  return (
    <div>
      <LazyDayChart keys={keys} values={values} tone={tone} unit={unit} hourLabels={hourLabels} />
      <p className="mt-2 text-xs text-slate-400">
        بیشترین مقدار {hourLabels ? "در یک ساعت" : "روزانه"}: {formatNumber(max)} {unit}
        {!hourLabels && values.length > 2 && <span className="ms-3">خط‌چین = میانگین بازه</span>}
      </p>
    </div>
  );
}

/** رتبه‌بندی با نمودار میله‌ای افقی: rows = [{ label, value, sub? }] */
export function HBarList({ rows, tone = "green", empty = "داده‌ای ثبت نشده." }) {
  if (!rows.length) return <p className="py-6 text-center text-xs text-slate-400">{empty}</p>;
  return <LazyHBarChart rows={rows} tone={tone} />;
}
