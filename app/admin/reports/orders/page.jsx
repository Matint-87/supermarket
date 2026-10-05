import { FaBan, FaCheckCircle, FaShoppingBag } from "react-icons/fa";
import { Card, PageHeader } from "@/components/admin/ui";
import { DayBars, HBarList, RangeTabs, StatTile } from "@/components/admin/ReportWidgets";
import { ORDER_STATUS_OPTIONS } from "@/lib/admin-constants";
import { ordersReport, parseDays } from "@/lib/admin-reports";
import { requireAdmin } from "@/lib/dal";
import { formatNumber } from "@/lib/format";
import { SHIPPING_LABELS } from "@/lib/shipping";
import { toFaDigits } from "@/lib/phone";

export const metadata = { title: "گزارش سفارش‌ها | پنل مدیریت" };

export default async function OrdersReportPage({ searchParams }) {
  await requireAdmin();
  const days = parseDays(await searchParams);
  const r = await ordersReport(days);

  const pct = (n) => (r.total ? `${formatNumber(Math.round((n / r.total) * 100))}٪` : "—");
  const delivered = r.byStatus.DELIVERED ?? 0;
  const bad = (r.byStatus.CANCELED ?? 0) + (r.byStatus.RETURNED ?? 0);
  const peak = Math.max(...r.byHour);
  const peakHour = peak > 0 ? r.byHour.indexOf(peak) : null;

  return (
    <div>
      <PageHeader title="گزارش سفارش‌ها" description="وضعیت، روش ارسال و ساعت‌های شلوغ ثبت سفارش">
        <RangeTabs basePath="/admin/reports/orders" days={days} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="کل سفارش‌ها" value={formatNumber(r.total)} hint="همه‌ی وضعیت‌ها" icon={FaShoppingBag} />
        <StatTile label="تحویل‌شده" value={formatNumber(delivered)} hint={`${pct(delivered)} از کل`} tone="sky" icon={FaCheckCircle} />
        <StatTile label="لغو شده" value={formatNumber(bad)} hint={`${pct(bad)} از کل`} tone="red" icon={FaBan} />
      </div>

      <Card title="سفارش‌های روزانه" className="mt-4">
        <DayBars keys={r.keys} values={r.series} unit="سفارش" />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="به تفکیک وضعیت">
          <HBarList
            tone="violet"
            rows={ORDER_STATUS_OPTIONS.map((s) => ({ label: s.label, value: r.byStatus[s.value] ?? 0 })).filter((x) => x.value > 0)}
          />
        </Card>
        <Card title="به تفکیک روش ارسال">
          <HBarList
            tone="sky"
            rows={Object.entries(r.byMethod).map(([k, v]) => ({ label: SHIPPING_LABELS[k] ?? k, value: v }))}
          />
        </Card>
      </div>

      <Card title="ساعت ثبت سفارش (به وقت تهران)" className="mt-4">
        <DayBars keys={r.byHour.map((_, h) => `h${h}`)} values={r.byHour} tone="amber" unit="سفارش" hourLabels />
        {peakHour !== null && (
          <p className="mt-2 text-xs text-slate-500">
            شلوغ‌ترین ساعت: {toFaDigits(String(peakHour).padStart(2, "0"))}:۰۰ تا {toFaDigits(String((peakHour + 1) % 24).padStart(2, "0"))}:۰۰
          </p>
        )}
      </Card>
    </div>
  );
}
