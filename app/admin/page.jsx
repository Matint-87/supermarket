import Link from "next/link";
import { FaBoxOpen, FaClock, FaDoorClosed, FaDoorOpen, FaMoneyBillWave, FaUsers } from "react-icons/fa";
import { Card, OrderStatusBadge, PageHeader } from "@/components/admin/ui";
import { LOW_STOCK_THRESHOLD } from "@/lib/admin-constants";
import { fullName } from "@/lib/admin-dal";
import { prisma } from "@/lib/db";
import { getStoreStatus } from "@/lib/settings";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDate } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";

export const metadata = { title: "داشبورد | پنل مدیریت" };

// رنگ کاشی آیکن هر کارت آمار (کلاس‌ها کامل نوشته شدن تا Tailwind اسکنشون کنه)
const TONES = {
  amber: "bg-amber-50 text-amber-600",
  green: "bg-green-50 text-green-700",
  sky: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
};

function Stat({ label, value, href, hint, icon: Icon, tone = "green" }) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft transition duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-pop"
    >
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-2 truncate text-xl font-extrabold sm:text-2xl tracking-tight text-slate-800">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105 ${TONES[tone]}`}>
        <Icon size={18} />
      </span>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const lowStockWhere = { isActive: true, stock: { lte: LOW_STOCK_THRESHOLD } };

  const [userCount, productCount, pendingCount, lowStockCount, sales, recentOrders, lowStock, store] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count({ where: { status: { in: ["PENDING", "PROCESSING", "SHIPPING"] } } }),
    prisma.product.count({ where: lowStockWhere }),
    prisma.order.aggregate({ where: { status: "DELIVERED" }, _sum: { payable: true } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: true } }),
    prisma.product.findMany({ where: lowStockWhere, orderBy: { stock: "asc" }, take: 6 }),
    getStoreStatus(),
  ]);

  return (
    <div>
      <PageHeader title="داشبورد" description="نمای کلی فروشگاه" />

      {/* وضعیت باز/بسته‌ی فروشگاه — با کلیک می‌ره صفحه‌ی تغییر وضعیت */}
      <Link
        href="/admin/store-status"
        className={`mb-4 flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm transition hover:shadow-soft ${
          store.open ? "border-green-200 bg-green-50/60 text-green-800" : "border-amber-200 bg-amber-50/60 text-amber-800"
        }`}
      >
        <span className="flex items-center gap-3 font-extrabold">
          {store.open ? <FaDoorOpen size={18} /> : <FaDoorClosed size={18} />}
          {store.open ? "فروشگاه باز است" : "فروشگاه بسته است"}
        </span>
        <span className="text-xs font-medium underline">{store.open ? "بستن فروشگاه" : "باز کردن فروشگاه"}</span>
      </Link>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="سفارش‌های جاری" value={formatNumber(pendingCount)} href="/admin/orders?status=PENDING" hint="در انتظار، آماده‌سازی یا ارسال" icon={FaClock} tone="amber" />
        <Stat label="فروش تحویل‌شده" value={formatToman(sales._sum.payable ?? 0)} href="/admin/orders?status=DELIVERED" icon={FaMoneyBillWave} tone="green" />
        <Stat label="محصولات" value={formatNumber(productCount)} href="/admin/products" icon={FaBoxOpen} tone="sky" />
        <Stat label="کاربران" value={formatNumber(userCount)} href="/admin/users" icon={FaUsers} tone="violet" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="آخرین سفارش‌ها">
          {recentOrders.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">هنوز سفارشی ثبت نشده.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <div className="min-w-0">
                    <Link href={`/admin/orders/${o.code}`} className="font-bold text-slate-800 hover:text-green-700">
                      {toFaDigits(o.code)}
                    </Link>
                    <p className="truncate text-slate-500">
                      {fullName(o.user) || o.recipientName} — {formatJalaliDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-medium text-slate-700">{formatToman(o.payable)}</span>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/orders" className="mt-3 inline-block text-xs font-medium text-green-700 hover:underline">
            مشاهده‌ی همه‌ی سفارش‌ها
          </Link>
        </Card>

        <Card title={`کم‌موجودی‌ها (${formatNumber(lowStockCount)})`}>
          {lowStock.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400">همه‌ی محصولات فعال موجودی کافی دارند.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                  <span className="truncate text-slate-700">{p.name}</span>
                  <span className={`shrink-0 font-bold ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}>
                    {p.stock === 0 ? "ناموجود" : `${formatNumber(p.stock)} عدد`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/products?status=low" className="mt-3 inline-block text-xs font-medium text-green-700 hover:underline">
            مشاهده‌ی همه
          </Link>
        </Card>
      </div>
    </div>
  );
}
