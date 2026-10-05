import Link from "next/link";
import { FaCheckCircle, FaChevronLeft, FaChevronRight, FaMoneyBillWave, FaReceipt, FaShoppingBag, FaUndoAlt } from "react-icons/fa";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import { DayBars, HBarList, StatTile } from "@/components/admin/ReportWidgets";
import { Card, OrderStatusBadge, PageHeader } from "@/components/admin/ui";
import { ORDER_STATUS_OPTIONS, PAYMENT_METHOD_LABELS } from "@/lib/admin-constants";
import { periodReport } from "@/lib/admin-reports";
import { requireAdmin } from "@/lib/dal";
import { daysBetween, parseDayRange } from "@/lib/date-range";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDateTime, formatJalaliKey, shiftDayKey, tehranTodayKey } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { SHIPPING_LABELS } from "@/lib/shipping";

export const metadata = { title: "گزارش روزانه | پنل مدیریت" };

export default async function DailyReportPage({ searchParams }) {
  await requireAdmin();
  const today = tehranTodayKey();
  const parsed = parseDayRange(await searchParams);
  // بدون فیلتر = گزارش «امروز»
  const from = parsed.from || today;
  const to = parsed.to || today;
  const single = from === to;
  const r = await periodReport(from, to);

  const title = single ? `گزارش ${formatJalaliKey(from)}${from === today ? " (امروز)" : ""}` : `گزارش ${formatJalaliKey(from)} تا ${formatJalaliKey(to)}`;
  const span = daysBetween(from, to);
  const nextTo = shiftDayKey(to, span) > today ? today : shiftDayKey(to, span);
  const nav = (a, b) => `/admin/reports/daily?from=${a}&to=${b}`;
  const navCls = "flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-green-100 hover:text-green-800";

  return (
    <div>
      <PageHeader title={title} description="فروش معتبر = سفارش‌های لغو‌نشده، بر اساس تاریخ ثبت سفارش (به وقت تهران)">
        <Link href={nav(shiftDayKey(from, -span), shiftDayKey(from, -1))} className={navCls} scroll={false} aria-label="بازه‌ی قبلی">
          <FaChevronRight size={10} /> {single ? "روز قبل" : "بازه‌ی قبلی"}
        </Link>
        {to < today ? (
          <Link href={nav(shiftDayKey(to, 1), nextTo)} className={navCls} scroll={false} aria-label="بازه‌ی بعدی">
            {single ? "روز بعد" : "بازه‌ی بعدی"} <FaChevronLeft size={10} />
          </Link>
        ) : null}
      </PageHeader>

      <DateRangeFilter title="تاریخ گزارش" defaultToday />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="مبلغ فروش" value={formatToman(r.revenue)} hint={`${formatNumber(r.validOrders)} سفارش معتبر`} icon={FaMoneyBillWave} />
        <StatTile label="میانگین سبد خرید" value={formatToman(r.avgOrder)} tone="sky" icon={FaReceipt} />
        <StatTile
          label="تحویل‌شده در این بازه"
          value={formatNumber(r.deliveredInPeriod.count)}
          hint={formatToman(r.deliveredInPeriod.revenue)}
          tone="violet"
          icon={FaCheckCircle}
        />
        <StatTile
          label="سفارش‌های لغوشده"
          value={formatNumber(r.status.CANCELED + r.status.RETURNED)}
          hint={`${formatToman(r.lost)} فروش ازدست‌رفته`}
          tone="red"
          icon={FaUndoAlt}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title={single ? "ساعت ثبت سفارش (به وقت تهران)" : "فروش روزانه (تومان)"} className="lg:col-span-2">
          {single ? (
            <DayBars keys={r.byHour.map((_, h) => `h${h}`)} values={r.byHour} tone="amber" unit="سفارش" hourLabels />
          ) : (
            <DayBars keys={r.keys} values={r.revenueSeries} unit="تومان" />
          )}
        </Card>
        <Card title="خلاصه‌ی مالی">
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">کل سفارش‌های ثبت‌شده</dt>
              <dd className="font-bold text-slate-800">{formatNumber(r.totalOrders)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">تخفیف داده‌شده</dt>
              <dd className="font-bold text-slate-800">{formatToman(r.discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">هزینه‌ی ارسال دریافتی</dt>
              <dd className="font-bold text-slate-800">{formatToman(r.shippingFees)}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <dt className="text-slate-500">پرداخت‌های موفق ثبت‌شده</dt>
              <dd className="font-bold text-emerald-700">{formatToman(r.paid)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">برگشت وجه</dt>
              <dd className="font-bold text-orange-700">{formatToman(r.refunded)}</dd>
            </div>
          </dl>
          {r.paidByMethod.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
              {r.paidByMethod.map((m) => (
                <li key={m.method} className="flex justify-between">
                  <span>{PAYMENT_METHOD_LABELS[m.method] ?? m.method} ({formatNumber(m.count)})</span>
                  <span className="font-medium text-slate-800">{formatToman(m.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-5 text-slate-400">پرداخت‌ها فقط تراکنش‌های ثبت‌شده در بخش «مالی» (بر اساس تاریخ تراکنش) هستند.</p>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="وضعیت سفارش‌های ثبت‌شده در این بازه">
          <HBarList
            tone="violet"
            rows={ORDER_STATUS_OPTIONS.map((s) => ({ label: s.label, value: r.status[s.value] ?? 0 })).filter((x) => x.value > 0)}
            empty="سفارشی ثبت نشده."
          />
        </Card>
        <Card title="روش ارسال (سفارش معتبر)">
          <HBarList
            tone="sky"
            rows={r.byMethod.map((m) => ({ label: SHIPPING_LABELS[m.key] ?? m.key, value: m.count, sub: formatToman(m.revenue) }))}
            empty="سفارشی ثبت نشده."
          />
        </Card>
        <Card title="پرفروش‌ترین کالاها (تعداد)">
          <HBarList tone="green" rows={r.topProducts.map((p) => ({ label: p.name, value: p.qty, sub: formatToman(p.revenue) }))} empty="فروشی ثبت نشده." />
        </Card>
      </div>

      <Card title={`سفارش‌های این بازه${r.totalOrders > r.recent.length ? ` (${formatNumber(r.recent.length)} مورد آخر از ${formatNumber(r.totalOrders)})` : ""}`} className="mt-4">
        {r.recent.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">در این بازه سفارشی ثبت نشده.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-start text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pe-3 font-medium">کد سفارش</th>
                  <th className="py-2 pe-3 font-medium">گیرنده</th>
                  <th className="py-2 pe-3 font-medium">زمان ثبت</th>
                  <th className="py-2 pe-3 font-medium">ارسال</th>
                  <th className="py-2 pe-3 font-medium">مبلغ</th>
                  <th className="py-2 pe-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {r.recent.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pe-3">
                      <Link href={`/admin/orders/${o.code}`} className="font-bold text-slate-800 hover:text-green-700" dir="ltr">
                        {toFaDigits(o.code)}
                      </Link>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">{o.recipientName}</td>
                    <td className="py-2.5 pe-3 whitespace-nowrap text-slate-600">{formatJalaliDateTime(o.createdAt)}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{SHIPPING_LABELS[o.shippingMethod] ?? "—"}</td>
                    <td className="py-2.5 pe-3 font-medium text-slate-700">{formatToman(o.payable)}</td>
                    <td className="py-2.5 pe-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {r.totalOrders > 0 && (
          <Link href={`/admin/orders?from=${from}&to=${to}`} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:underline">
            <FaShoppingBag size={11} /> مشاهده‌ی همه‌ی سفارش‌های این بازه (با امکان چاپ فاکتور)
          </Link>
        )}
      </Card>
    </div>
  );
}
