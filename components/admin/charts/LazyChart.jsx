"use client";

// پوشه‌ی لود تنبل نمودارها: Recharts (سنگین) فقط وقتی نمودار نزدیک دید می‌آد دانلود و رندر می‌شه.
// خود کامپوننت‌های Impl با dynamic import جدا می‌شن، پس توی باندل صفحه‌های غیرگزارشی نیستن.
import dynamic from "next/dynamic";
import { useInView } from "@/lib/use-in-view";

function Skeleton({ height }) {
  return <div style={{ height }} className="w-full rounded-xl bg-slate-100/70" aria-hidden="true" />;
}

const DayChartImpl = dynamic(() => import("./DayChartImpl"), { ssr: false, loading: () => <Skeleton height={220} /> });
const HBarChartImpl = dynamic(() => import("./HBarChartImpl"), { ssr: false, loading: () => <Skeleton height={120} /> });

export function LazyDayChart(props) {
  const height = props.height ?? 220;
  const [ref, inView] = useInView("250px");
  return <div ref={ref}>{inView ? <DayChartImpl {...props} height={height} /> : <Skeleton height={height} />}</div>;
}

export function LazyHBarChart(props) {
  const [ref, inView] = useInView("250px");
  return <div ref={ref}>{inView ? <HBarChartImpl {...props} /> : <Skeleton height={props.rows.length * 38 + 8} />}</div>;
}
