import { FaMoneyBillWave, FaPercent, FaReceipt, FaUndoAlt } from "react-icons/fa";
import { Card, PageHeader } from "@/components/admin/ui";
import { DayBars, RangeTabs, StatTile } from "@/components/admin/ReportWidgets";
import { parseDays, salesReport } from "@/lib/admin-reports";
import { requireAdmin } from "@/lib/dal";
import { formatNumber, formatToman } from "@/lib/format";

export const metadata = { title: "گزارش فروش | پنل مدیریت" };

export default async function SalesReportPage({ searchParams }) {
  await requireAdmin();
  const days = parseDays(await searchParams);
  const r = await salesReport(days);

  return (
    <div>
      <PageHeader title="گزارش فروش" description="فروش معتبر = سفارش‌هایی که لغو نشده‌اند">
        <RangeTabs basePath="/admin/reports/sales" days={days} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="مبلغ فروش" value={formatToman(r.revenue)} hint={`${formatNumber(r.orders)} سفارش معتبر`} icon={FaMoneyBillWave} />
        <StatTile label="میانگین سبد خرید" value={formatToman(r.avgOrder)} tone="sky" icon={FaReceipt} />
        <StatTile label="تخفیف داده‌شده" value={formatToman(r.discount)} tone="amber" icon={FaPercent} />
        <StatTile
          label="سفارش‌های لغوشده"
          value={formatNumber(r.canceled + r.returned)}
          hint={`${formatToman(r.lost)} فروش ازدست‌رفته`}
          tone="red"
          icon={FaUndoAlt}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="فروش روزانه (تومان)" className="lg:col-span-2">
          <DayBars keys={r.keys} values={r.revenueSeries} unit="تومان" />
        </Card>
        <Card title="خلاصه">
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">فروش تحویل‌شده</dt>
              <dd className="font-bold text-slate-800">{formatToman(r.delivered)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">پرداخت‌های موفق ثبت‌شده</dt>
              <dd className="font-bold text-slate-800">{formatToman(r.paid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">برگشت وجه‌های موفق</dt>
              <dd className="font-bold text-orange-700">{formatToman(r.refunded)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <dt className="text-slate-500">کل سفارش‌های ثبت‌شده</dt>
              <dd className="font-bold text-slate-800">{formatNumber(r.totalOrders)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-5 text-slate-400">
            پرداخت‌ها فقط شامل تراکنش‌هایی است که در بخش «مالی» ثبت شده‌اند.
          </p>
        </Card>
      </div>

      <Card title="تعداد سفارش معتبر در روز" className="mt-4">
        <DayBars keys={r.keys} values={r.ordersSeries} tone="sky" unit="سفارش" />
      </Card>
    </div>
  );
}
