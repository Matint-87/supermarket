"use client";

import Link from "next/link";
import {
  FaChevronLeft,
  FaMapMarkerAlt,
  FaPalette,
  FaShoppingBag,
  FaSignOutAlt,
  FaStoreAlt,
  FaUser,
  FaWallet,
} from "react-icons/fa";
import { toFaDigits } from "@/lib/phone";
import AvatarUpload from "./AvatarUpload";

const NAV_ITEMS = [
  { key: "orders", label: "سفارش‌ها", icon: FaShoppingBag },
  { key: "wallet", label: "کیف پول", icon: FaWallet },
  { key: "addresses", label: "آدرس‌ها", icon: FaMapMarkerAlt },
  { key: "info", label: "اطلاعات حساب کاربری", icon: FaUser },
  { key: "appearance", label: "ظاهر سایت", icon: FaPalette },
];

export default function AccountSidebar({ user, active, onSelect, onLogout, loggingOut, onAvatarSaved }) {
  const isAdmin = user.role === "ADMIN";

  return (
    <aside className="shrink-0 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-soft md:w-72">
      {/* سربرگ: بنر گرادیانی + آواتار روی لبه‌ی بنر */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="h-20 bg-linear-to-l from-green-700 via-green-600 to-green-400"
        />
        {/* الگوی دایره‌های محو روی بنر */}
        <div aria-hidden="true" className="absolute -top-6 start-6 h-24 w-24 rounded-full bg-white/10" />
        <div aria-hidden="true" className="absolute -bottom-8 end-10 h-20 w-20 rounded-full bg-white/10" />

        <div className="absolute inset-x-0 -bottom-9 flex justify-center">
          <div className="rounded-full bg-white p-1 shadow-pop">
            <AvatarUpload user={user} size={64} onSaved={onAvatarSaved} />
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-11 text-center">
        <p className="truncate text-base font-extrabold text-slate-800">
          {user.firstName ? `${user.firstName} ${user.lastName}` : "کاربر"}
        </p>
        <p className="mt-0.5 text-xs text-slate-500" dir="ltr">
          {toFaDigits(user.phone)}
        </p>
        {isAdmin && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
            مدیر فروشگاه
          </span>
        )}
      </div>

      {/* دکمه‌ی ورود به پنل مدیریت — فقط برای ادمین‌ها نمایش داده می‌شه (دسترسی واقعی سمت سرور هم چک می‌شه) */}
      {isAdmin && (
        <div className="px-3 pb-3">
          <Link
            href="/admin"
            className="group flex items-center gap-3 rounded-2xl bg-linear-to-l from-green-900 to-green-700 p-3 text-white shadow-brand transition hover:from-green-950 hover:to-green-800 active:scale-[0.99]"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <FaStoreAlt size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold">مدیریت فروشگاه</span>
              <span className="block text-xs text-green-100/90">ورود به پنل مدیریت</span>
            </span>
            <FaChevronLeft size={12} className="transition group-hover:-translate-x-0.5" />
          </Link>
        </div>
      )}

      <nav className="space-y-1 border-t border-slate-100 p-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-green-50 text-green-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  isActive ? "bg-green-600 text-white shadow-sm" : "bg-slate-100 text-slate-500"
                }`}
              >
                <Icon size={14} />
              </span>
              {item.label}
              {isActive && <span aria-hidden="true" className="absolute inset-y-2 end-0 w-1 rounded-full bg-green-600" />}
            </button>
          );
        })}

        <div className="my-2 border-t border-slate-100" />

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            <FaSignOutAlt size={14} />
          </span>
          خروج از حساب کاربری
        </button>
      </nav>
    </aside>
  );
}
