"use client";

import { useRouter, usePathname } from "next/navigation";
import { FaArrowRight } from "react-icons/fa";
import { cn } from "@/lib/utils";

/**
 * دکمه‌ی بازگشت.
 * اگه کاربر از صفحه‌ای داخل همین سایت اومده باشه یک قدم عقب می‌ره، وگرنه (مثلاً لینک مستقیم)
 * به صفحه‌ی `fallback` می‌ره تا هیچ‌وقت بی‌جواب نمونه.
 * توی صفحه‌هایی که توی `hideOn` هستن (مثل صفحه‌ی اصلی) نمایش داده نمی‌شه.
 *
 * variant="inline": نسخه‌ی مدرنِ داخل کارت فرم‌ها (قرص نرم + آیکون گرد که موقع hover کمی جلو می‌ره).
 * onClick: اگه بدی، به‌جای «یک قدم عقب» همین اجرا می‌شه (مثلاً برگشت به مرحله‌ی قبلِ فرم).
 */
export default function BackButton({
  fallback = "/",
  hideOn = ["/"],
  label = "بازگشت",
  className = "",
  withLabel = false,
  variant = "floating",
  onClick,
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (hideOn.includes(pathname)) return null;

  function goBack() {
    if (onClick) return onClick();
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(fallback);
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={label}
        className={cn(
          "group inline-flex h-9 items-center gap-2 rounded-full bg-slate-100 ps-1.5 pe-3.5 text-xs font-bold text-slate-600 transition hover:bg-green-50 hover:text-green-700 active:scale-95",
          className,
        )}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm transition group-hover:translate-x-0.5 group-hover:text-green-700">
          <FaArrowRight size={11} />
        </span>
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={cn(
        "flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white text-slate-600 shadow-soft transition hover:border-green-300 hover:text-green-700 active:scale-95",
        withLabel ? "px-4 text-xs font-bold" : "w-10",
        className,
      )}
    >
      <FaArrowRight size={14} />
      {withLabel && label}
    </button>
  );
}
