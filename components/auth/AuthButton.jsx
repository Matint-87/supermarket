"use client";

import Link from "next/link";
import { FaUserCircle } from "react-icons/fa";
import { toFaDigits } from "@/lib/phone";
import { useAuth } from "./AuthProvider";

/** دکمه‌ی «ورود / ثبت نام» هدر؛ بعد از ورود نام کاربر و لینک پروفایل رو نشون می‌ده */
export default function AuthButton() {
  const { user, loading } = useAuth();
  const cls =
    "hidden items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-700 sm:flex";

  if (loading) {
    return <span aria-hidden="true" className="hidden h-9 w-28 animate-pulse rounded-full bg-slate-100 sm:block" />;
  }
  if (!user) {
    return (
      <Link href="/auth/login" className={cls}>
        <FaUserCircle size={18} />
        ورود / ثبت نام
      </Link>
    );
  }
  return (
    <Link href="/profile" className={cls}>
      <FaUserCircle size={18} className="text-green-600" />
      {user.firstName || toFaDigits(user.phone)}
    </Link>
  );
}
