"use client";

// نمودار میله‌ای افقی (رتبه‌بندی‌ها) با Recharts؛ فقط از طریق LazyChart لود می‌شه.
import { useMemo } from "react";
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import { AXIS_COLOR, toneColor } from "./chart-utils";

const ROW_H = 38;
const LABEL_W = 116;

function trim(s, n = 15) {
  const t = String(s);
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

/** برچسب دسته: یک خط، تراز از راست (بدون شکستن خودکار متن که روی هم می‌افتاد) */
function CategoryTick({ x, y, payload }) {
  return (
    <text x={x + LABEL_W - 14} y={y} dy={4} textAnchor="end" fontSize={11} fill={AXIS_COLOR}>
      {payload.value}
    </text>
  );
}

/** مقدار کنار انتهای میله (محور برعکسه، پس انتهای میله لبه‌ی چپ مستطیله) */
function ValueLabel({ x, y, width, height, value, format }) {
  const left = Math.min(x, x + width);
  return (
    <text x={left - 6} y={y + height / 2} dy={4} textAnchor="end" fontSize={11} fontWeight={700} fill="var(--color-slate-700, #334155)">
      {format(value)}
    </text>
  );
}

function ChartTooltip({ active, payload, format }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div dir="rtl" className="max-w-56 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop">
      <p className="font-medium text-slate-700">{p.label}</p>
      <p className="mt-0.5 font-extrabold text-slate-800">{format(p.value)}</p>
      {p.sub && <p className="mt-0.5 text-slate-400">{p.sub}</p>}
    </div>
  );
}

/** rows = [{ label, value, sub? }] — بیشترین مقدار بالا و پررنگ‌تر */
export default function HBarChartImpl({ rows, tone = "green" }) {
  const format = formatNumber; // تابع از سرور به کلاینت پاس داده نمی‌شه؛ همه‌ی گزارش‌ها عدد فارسی ساده می‌خوان
  const color = toneColor(tone);
  const max = useMemo(() => Math.max(...rows.map((r) => r.value), 1), [rows]);
  const data = useMemo(() => rows.map((r, i) => ({ ...r, short: trim(r.label), rank: i })), [rows]);
  const height = rows.length * ROW_H + 8;

  return (
    <div dir="ltr" style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap={8}>
          {/* محور عددی برعکس تا میله‌ها از راست رشد کنن؛ ۲۵٪ فضای اضافه برای برچسب مقدار */}
          <XAxis type="number" reversed hide domain={[0, max * 1.3]} />
          <YAxis type="category" dataKey="short" orientation="right" width={LABEL_W} tickLine={false} axisLine={false} tick={<CategoryTick />} interval={0} />
          <Tooltip cursor={{ fill: color, fillOpacity: 0.07 }} content={<ChartTooltip format={format} />} />
          <Bar dataKey="value" radius={6} barSize={14} isAnimationActive={false} background={{ fill: "var(--color-slate-100, #f1f5f9)", radius: 6 }}>
            {data.map((d) => (
              <Cell key={d.label} fill={color} fillOpacity={d.rank === 0 ? 1 : 0.75} />
            ))}
            <LabelList dataKey="value" content={<ValueLabel format={format} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
