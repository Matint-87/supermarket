"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TbHome2, TbLayoutGrid, TbShoppingBag, TbUser } from "react-icons/tb";
import { useAuth } from "@/components/auth/AuthProvider";
import { useCart } from "@/components/cart/useCart";
import { formatNumber } from "@/lib/format";

const items = [
  { key: "home", label: "خانه", icon: TbHome2, href: "/", requiresAuth: false },
  { key: "products", label: "محصولات", icon: TbLayoutGrid, href: "/products", requiresAuth: false },
  { key: "cart", label: "سبد خرید", icon: TbShoppingBag, href: "/cart", requiresAuth: false },
  { key: "profile", label: "پروفایل", icon: TbUser, href: "/profile?tab=info", requiresAuth: true },
];

/**
 * منوی پایین موبایل.
 * گزینه‌ی فعال از روی مسیر فعلی حساب می‌شه (در صورت نیاز با prop `active` هم می‌شه دستی تعیینش کرد).
 * «سفارش‌ها» از منو برداشته شد؛ از داخل «پروفایل» (تب سفارش‌ها) در دسترسه.
 */
export default function BottomNav({ active }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { count, ready } = useCart();

  const current =
    active ??
    (pathname === "/"
      ? "home"
      : pathname.startsWith("/products")
        ? "products"
        : pathname.startsWith("/cart")
          ? "cart"
          : pathname.startsWith("/profile")
            ? "profile"
            : null);

  return (
    <nav
      aria-label="منوی اصلی"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
    >
      {/* نوار شناور گرد با سایه و شیشه‌ای */}
      <ul className="pointer-events-auto mx-auto flex max-w-md items-center justify-around rounded-3xl border border-slate-200/70 bg-white/90 px-2 py-1.5 shadow-pop backdrop-blur-xl">
        {items.map(({ key, label, icon: Icon, href, requiresAuth }) => {
          const isActive = current === key;
          const target = requiresAuth && !user ? `/auth/login?next=${encodeURIComponent(href)}` : href;
          const badge = key === "cart" && ready && count > 0 ? (count > 99 ? "+۹۹" : formatNumber(count)) : null;

          return (
            <li key={key} className="flex-1">
              <Link
                href={target}
                aria-current={isActive ? "page" : undefined}
                className="flex w-full flex-col items-center gap-0.5 py-1 transition-colors"
              >
                <span
                  className={`relative flex h-9 w-14 items-center justify-center rounded-2xl transition-all ${
                    isActive ? "bg-green-100 text-green-700" : "text-slate-500"
                  }`}
                >
                  <Icon size={23} />
                  {badge && (
                    <span className="absolute -top-1 end-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                      {badge}
                    </span>
                  )}
                </span>

                <span className={`text-xs ${isActive ? "font-bold text-green-700" : "font-normal text-slate-500"}`}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
