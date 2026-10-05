"use client";

// نمودار روزانه/ساعتی با Recharts. فقط از طریق LazyChart (با dynamic import) لود می‌شه تا Recharts توی باندل اولیه نیاد.
import { useId, useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import { AXIS_COLOR, GRID_COLOR, buildDaySeries, formatAxisNumber, toneColor } from "./chart-utils";

const TICK = { fontSize: 11, fill: AXIS_COLOR };

function ChartTooltip({ active, payload, unit, format }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div dir="rtl" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-pop">
      <p className="text-slate-500">{p.full}</p>
      <p className="mt-0.5 font-extrabold text-slate-800">
        {format(p.value)} {unit}
      </p>
    </div>
  );
}

/**
 * keys/values موازی (قدیمی‌ترین روز اول). صفحه راست‌به‌چپه، پس محور X برعکس می‌شه تا قدیمی‌ترین روز سمت راست باشه.
 * hourLabels=true → ستونی (ساعت‌های شبانه‌روز)؛ وگرنه نمودار ناحیه‌ای نرم با گرادیان.
 */
export default function DayChartImpl({ keys, values, tone = "green", unit = "", hourLabels = false, height = 220 }) {
  const format = formatNumber;
  const gid = useId().replace(/:/g, "");
  const color = toneColor(tone);
  const data = useMemo(() => buildDaySeries(keys, values, hourLabels), [keys, values, hourLabels]);
  const avg = useMemo(() => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0), [values]);

  const common = {
    data,
    margin: { top: 8, right: 4, left: 4, bottom: 0 },
  };
  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={GRID_COLOR} strokeDasharray="3 4" />
      <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tick={TICK} interval="preserveStartEnd" minTickGap={hourLabels ? 18 : 28} tickMargin={8} />
      <YAxis orientation="right" width="auto" tickLine={false} axisLine={false} tick={TICK} tickFormatter={formatAxisNumber} allowDecimals={false} />
    </>
  );

  return (
    <div dir="ltr" style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {hourLabels ? (
          <BarChart {...common} barCategoryGap="18%">
            {axes}
            <Tooltip cursor={{ fill: color, fillOpacity: 0.08 }} content={<ChartTooltip unit={unit} format={format} />} />
            <Bar dataKey="value" fill={color} radius={[5, 5, 0, 0]} isAnimationActive={false} />
          </BarChart>
        ) : (
          <AreaChart {...common}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" style={{ stopColor: color }} stopOpacity={0.35} />
                <stop offset="100%" style={{ stopColor: color }} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {axes}
            <Tooltip cursor={{ stroke: color, strokeOpacity: 0.25 }} content={<ChartTooltip unit={unit} format={format} />} />
            {avg > 0 && values.length > 2 && <ReferenceLine y={avg} stroke={color} strokeOpacity={0.5} strokeDasharray="4 4" />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              fill={`url(#${gid})`}
              dot={values.length <= 14 ? { r: 3, strokeWidth: 0, fill: color } : false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: color }}
              isAnimationActive={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
