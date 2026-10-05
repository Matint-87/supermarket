"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FaBars,
  FaChartLine,
  FaChevronDown,
  FaPalette,
  FaCreditCard,
  FaHistory,
  FaShoppingBag,
  FaSignOutAlt,
  FaStore,
  FaStoreAlt,
  FaTachometerAlt,
  FaTimes,
  FaTruck,
  FaUsers,
  FaBoxes,
} from "react-icons/fa";
import { useAuth } from "@/components/auth/AuthProvider";

// منوی پنل: هر گروه یا مستقیم لینکه (href) یا زیرمنو داره (children).
const NAV = [
  { label: "داشبورد", icon: FaTachometerAlt, href: "/admin", exact: true },
  {
    label: "فروشگاه",
    icon: FaBoxes,
    children: [
      { href: "/admin/store-status", label: "وضعیت فروشگاه (باز/بسته)" },
      { href: "/admin/products", label: "محصولات" },
      { href: "/admin/categories", label: "دسته‌بندی‌ها" },
      { href: "/admin/brands", label: "برندها" },
      { href: "/admin/banners", label: "بنرهای صفحه‌ی اصلی" },
    ],
  },
  {
    label: "سفارشات",
    icon: FaShoppingBag,
    children: [
      { href: "/admin/orders", label: "همه سفارش‌ها", exact: true, noStatus: true },
      { href: "/admin/orders?status=PENDING", label: "در انتظار بررسی" },
      { href: "/admin/orders?status=PROCESSING", label: "در حال آماده‌سازی" },
      { href: "/admin/orders?status=SHIPPING", label: "در حال ارسال" },
      { href: "/admin/orders?status=DELIVERED", label: "تحویل‌شده" },
      { href: "/admin/orders?status=CANCELED", label: "لغوشده" },
    ],
  },
  {
    label: "ارسال",
    icon: FaTruck,
    children: [
      { href: "/admin/shipping/zones", label: "محدوده‌های ارسال" },
      { href: "/admin/shipping/couriers", label: "پیک‌ها" },
      { href: "/admin/shipping/settings", label: "تنظیمات ارسال" },
    ],
  },
  {
    label: "کاربران",
    icon: FaUsers,
    children: [
      { href: "/admin/users", label: "کاربران", exact: true },
      { href: "/admin/addresses", label: "آدرس‌ها" },
    ],
  },
  {
    label: "مالی",
    icon: FaCreditCard,
    children: [
      { href: "/admin/finance/transactions", label: "تراکنش‌ها" },
      { href: "/admin/finance/payments", label: "پرداخت‌ها" },
      { href: "/admin/finance/refunds", label: "برگشت وجه" },
    ],
  },
  {
    label: "گزارش‌ها",
    icon: FaChartLine,
    children: [
      { href: "/admin/reports/daily", label: "گزارش روزانه" },
      { href: "/admin/reports/sales", label: "فروش" },
      { href: "/admin/reports/products", label: "محصولات" },
      { href: "/admin/reports/users", label: "کاربران" },
      { href: "/admin/reports/orders", label: "سفارش‌ها" },
    ],
  },
  { label: "پالت رنگی سایت", icon: FaPalette, href: "/admin/appearance" },
  { label: "لاگ فعالیت‌ها", icon: FaHistory, href: "/admin/activity-log" },
];

/** آیا این لینک الان فعاله؟ (فیلتر وضعیت سفارش‌ها هم توی تشخیص حساب می‌شه) */
function isLinkActive(item, pathname, searchParams) {
  if (item.soon) return false;
  const [path, query] = item.href.split("?");
  if (item.exact ? pathname !== path : !pathname.startsWith(path)) return false;
  const status = searchParams.get("status");
  if (query) return new URLSearchParams(query).get("status") === status;
  return item.noStatus ? !status : true;
}

export default function AdminShell({ admin, children }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // گروه‌هایی که کاربر خودش باز/بسته کرده؛ گروه دارای صفحه‌ی فعال همیشه باز می‌مونه
  const [toggled, setToggled] = useState({});

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    router.replace("/");
  }

  // منوی موبایل: با Escape بسته بشه و پشتش اسکرول نکنه
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const groupHasActive = (group) => group.children.some((c) => isLinkActive(c, pathname, searchParams));
  const isGroupOpen = (group) => toggled[group.label] ?? groupHasActive(group);
  const displayName = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || "مدیر سایت";

  // صفحه‌ی چاپ فاکتور: بدون منوی کناری (فقط خود فاکتور)
  if (pathname.startsWith("/admin/print")) return <>{children}</>;

  return (
    <div className="min-h-dvh bg-slate-50 font-[Number] md:flex">
      {/* نوار بالای موبایل */}
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-slate-200/70 bg-white/85 px-3 py-2.5 backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="باز کردن منو"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"
        >
          <FaBars size={16} />
        </button>
        <span className="text-sm font-extrabold text-slate-800">پنل مدیریت</span>
        <Link href="/" className="ms-auto flex items-center gap-1.5 text-xs font-medium text-green-700">
          <FaStore size={13} />
          فروشگاه
        </Link>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 start-0 z-40 w-72 flex-col border-e border-slate-200/70 bg-white p-4 shadow-pop md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:shadow-none ${
          open ? "flex" : "hidden"
        }`}
      >
        {/* سربرگ سایدبار: لوگوی پنل + نام مدیر */}
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-linear-to-l from-green-800 to-green-600 p-3 text-white shadow-brand">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <FaStoreAlt size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold">پنل مدیریت</p>
            <p className="mt-0.5 truncate text-xs text-green-100">{displayName}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="بستن منو"
            className="-m-2 p-2 text-white/70 hover:text-white md:hidden"
          >
            <FaTimes size={16} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;

            // گروه بدون زیرمنو: یک لینک ساده
            if (!item.children) {
              const active = isLinkActive(item, pathname, searchParams);
              const cls = `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-green-50 text-green-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`;
              const iconBox = (
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                    active ? "bg-green-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={14} />
                </span>
              );
              if (item.soon) {
                return (
                  <div key={item.label} className="flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400">
                    {iconBox}
                    {item.label}
                    <span className="ms-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-400">به‌زودی</span>
                  </div>
                );
              }
              return (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={cls}>
                  {iconBox}
                  {item.label}
                  {active && <span aria-hidden="true" className="absolute inset-y-2 end-0 w-1 rounded-full bg-green-600" />}
                </Link>
              );
            }

            // گروه با زیرمنو (آکاردئون)
            const hasActive = groupHasActive(item);
            const expanded = isGroupOpen(item);
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => setToggled((t) => ({ ...t, [item.label]: !expanded }))}
                  aria-expanded={expanded}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    hasActive ? "text-green-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                      hasActive ? "bg-green-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Icon size={14} />
                  </span>
                  {item.label}
                  <FaChevronDown size={11} className={`ms-auto text-slate-400 transition ${expanded ? "rotate-180" : ""}`} />
                </button>
                {expanded && (
                  <ul className="mb-1 mt-0.5 space-y-0.5 border-s border-slate-200 ms-6 ps-3">
                    {item.children.map((child) => {
                      const active = isLinkActive(child, pathname, searchParams);
                      if (child.soon) {
                        return (
                          <li key={child.href} className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400">
                            {child.label}
                            <span className="ms-auto rounded-full bg-slate-100 px-2 py-0.5 text-[11px]">به‌زودی</span>
                          </li>
                        );
                      }
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={`block rounded-lg px-3 py-2 text-xs transition ${
                              active ? "bg-green-50 font-bold text-green-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        <div className="space-y-1 border-t border-slate-100 pt-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <FaStore size={14} />
            </span>
            بازگشت به فروشگاه
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <FaSignOutAlt size={14} />
            </span>
            خروج از حساب
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-clip p-3 sm:p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
