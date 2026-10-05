import { FaBoxes, FaExclamationTriangle, FaTimesCircle } from "react-icons/fa";
import { Card, PageHeader } from "@/components/admin/ui";
import { HBarList, RangeTabs, StatTile } from "@/components/admin/ReportWidgets";
import { LOW_STOCK_THRESHOLD } from "@/lib/admin-constants";
import { parseDays, productsReport } from "@/lib/admin-reports";
import { requireAdmin } from "@/lib/dal";
import { formatNumber, formatToman } from "@/lib/format";

export const metadata = { title: "گزارش محصولات | پنل مدیریت" };

export default async function ProductsReportPage({ searchParams }) {
  await requireAdmin();
  const days = parseDays(await searchParams);
  const r = await productsReport(days);

  return (
    <div>
      <PageHeader title="گزارش محصولات" description="پرفروش‌ترین‌ها و وضعیت موجودی انبار">
        <RangeTabs basePath="/admin/reports/products" days={days} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="محصولات فعال" value={formatNumber(r.active)} icon={FaBoxes} />
        <StatTile label="ناموجود" value={formatNumber(r.out)} tone="red" icon={FaTimesCircle} />
        <StatTile label="موجودی کم" value={formatNumber(r.low)} hint={`${formatNumber(LOW_STOCK_THRESHOLD)} عدد یا کمتر`} tone="amber" icon={FaExclamationTriangle} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="پرفروش‌ترین‌ها (تعداد)">
          <HBarList rows={r.byQty.map((p) => ({ label: p.name, value: p.qty, sub: formatToman(p.revenue) }))} />
        </Card>
        <Card title="بیشترین درآمد (تومان)">
          <HBarList tone="sky" rows={r.byRevenue.map((p) => ({ label: p.name, value: p.revenue, sub: `${formatNumber(p.qty)} عدد فروش` }))} />
        </Card>
        <Card title="درآمد به تفکیک دسته‌بندی">
          <HBarList tone="violet" rows={r.byCategory.map((c) => ({ label: c.name, value: c.revenue, sub: `${formatNumber(c.qty)} عدد` }))} />
        </Card>
        <Card title="نیازمند تأمین موجودی">
          {r.lowList.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">همه‌ی محصولات موجودی کافی دارند.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-xs">
              {r.lowList.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5">
                  <span className="text-slate-700">{p.name}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.stock === 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
                    {p.stock === 0 ? "ناموجود" : `${formatNumber(p.stock)} عدد`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
