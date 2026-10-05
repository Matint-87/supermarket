import Link from "next/link";
import { FaBan, FaShoppingCart, FaUserPlus, FaUsers } from "react-icons/fa";
import { Card, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { DayBars, RangeTabs, StatTile } from "@/components/admin/ReportWidgets";
import { parseDays, usersReport } from "@/lib/admin-reports";
import { requireAdmin } from "@/lib/dal";
import { formatNumber, formatToman } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";

export const metadata = { title: "گزارش کاربران | پنل مدیریت" };

export default async function UsersReportPage({ searchParams }) {
  await requireAdmin();
  const days = parseDays(await searchParams);
  const r = await usersReport(days);

  return (
    <div>
      <PageHeader title="گزارش کاربران" description="ثبت‌نام‌های جدید و بهترین مشتری‌ها">
        <RangeTabs basePath="/admin/reports/users" days={days} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="کل کاربران" value={formatNumber(r.totalUsers)} icon={FaUsers} />
        <StatTile label="ثبت‌نام جدید" value={formatNumber(r.newUsers)} tone="sky" icon={FaUserPlus} />
        <StatTile label="خریداران فعال" value={formatNumber(r.buyers)} hint="حداقل یک سفارش معتبر در بازه" tone="violet" icon={FaShoppingCart} />
        <StatTile label="حساب‌های مسدود" value={formatNumber(r.banned)} tone="red" icon={FaBan} />
      </div>

      <Card title="ثبت‌نام روزانه" className="mt-4">
        <DayBars keys={r.keys} values={r.series} tone="sky" unit="کاربر" />
      </Card>

      <Card title="بهترین مشتری‌ها در این بازه" className="mt-4">
        {r.top.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">در این بازه خریدی ثبت نشده.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-start text-xs">
              <thead>
                <tr className={theadRowCls}>
                  <th className="py-2.5 ps-3 pe-3 font-medium">کاربر</th>
                  <th className="py-2.5 pe-3 font-medium">موبایل</th>
                  <th className="py-2.5 pe-3 font-medium">تعداد سفارش</th>
                  <th className="py-2.5 pe-3 font-medium">مجموع خرید</th>
                </tr>
              </thead>
              <tbody>
                {r.top.map((u) => (
                  <tr key={u.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3">
                      <Link href={`/admin/users/${u.id}`} className="font-medium text-slate-800 hover:text-green-700">
                        {u.name}
                      </Link>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">{toFaDigits(u.phone)}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(u.orders)}</td>
                    <td className="py-2.5 pe-3 font-medium text-slate-800">{formatToman(u.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
