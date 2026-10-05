"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FaCalendarAlt, FaTimes } from "react-icons/fa";
import { Spinner } from "@/components/ui/form";
import { MAX_RANGE_DAYS } from "@/lib/date-range";
import {
  JALALI_MONTHS,
  currentJalaliYear,
  dayKeyToJalali,
  formatJalaliKey,
  jalaliMonthLength,
  jalaliToDayKey,
  shiftDayKey,
  tehranTodayKey,
} from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const selectCls =
  "h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-center text-xs outline-none transition hover:border-green-300 focus:border-green-600 focus:ring-4 focus:ring-green-600/15";

/** انتخاب‌گر یک روز شمسی (روز/ماه/سال). value و onChange با «کلید روز» میلادی؛ تا هر سه انتخاب نشن onChange("") صدا می‌خوره */
export function JalaliDayPicker({ label, value, onChange }) {
  const [parts, setParts] = useState(() => dayKeyToJalali(value));
  const [prevValue, setPrevValue] = useState(value);
  // اگه مقدار از بیرون عوض شد (مثلاً دکمه‌ی «امروز»)، با اون هماهنگ شو
  if (value !== prevValue) {
    setPrevValue(value);
    setParts(dayKeyToJalali(value));
  }

  const thisYear = currentJalaliYear();
  const years = Array.from({ length: 6 }, (_, i) => thisYear - i);
  const days = Array.from({ length: jalaliMonthLength(parts.y, parts.m) }, (_, i) => i + 1);

  function update(patch) {
    const next = { ...parts, ...patch };
    setParts(next);
    if (!next.y || !next.m || !next.d) return onChange("");
    const d = Math.min(Number(next.d), jalaliMonthLength(next.y, next.m));
    onChange(jalaliToDayKey(next.y, next.m, d));
  }

  return (
    <div className="min-w-[230px] flex-1">
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <div className="grid grid-cols-3 gap-1.5">
        <Select aria-label={`${label} — روز`} value={parts.d} onChange={(e) => update({ d: e.target.value })} className={selectCls}>
          <option value="">روز</option>
          {days.map((n) => (
            <option key={n} value={n}>
              {toFaDigits(n)}
            </option>
          ))}
        </Select>
        <Select aria-label={`${label} — ماه`} value={parts.m} onChange={(e) => update({ m: e.target.value })} className={selectCls}>
          <option value="">ماه</option>
          {JALALI_MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </Select>
        <Select aria-label={`${label} — سال`} value={parts.y} onChange={(e) => update({ y: e.target.value })} className={selectCls}>
          <option value="">سال</option>
          {years.map((n) => (
            <option key={n} value={n}>
              {toFaDigits(n)}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

/**
 * فیلتر بازه‌ی تاریخ شمسی. مقدارها توی URL به‌صورت from=YYYY-MM-DD&to=YYYY-MM-DD (میلادی، به وقت تهران) نگه داشته می‌شن
 * و صفحه‌ی سرور با همون پارامترها دوباره رندر می‌شه.
 * defaultToday: اگه فیلتر خالی بود، صفحه «امروز» رو نشون می‌ده (گزارش روزانه) — پس پاک‌کردن فیلتر معنی نداره.
 */
export default function DateRangeFilter({ title = "تاریخ ثبت سفارش", defaultToday = false }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const urlFrom = params.get("from") ?? "";
  const urlTo = params.get("to") ?? urlFrom;
  const [from, setFrom] = useState(urlFrom);
  const [to, setTo] = useState(urlTo);
  const [prevUrl, setPrevUrl] = useState(`${urlFrom}|${urlTo}`);
  // با عوض‌شدن URL (دکمه‌های قبلی/بعدی، پیش‌تنظیم‌ها) کادرها هم هماهنگ بشن
  if (prevUrl !== `${urlFrom}|${urlTo}`) {
    setPrevUrl(`${urlFrom}|${urlTo}`);
    setFrom(urlFrom);
    setTo(urlTo);
  }

  const today = tehranTodayKey();

  function apply(nextFrom, nextTo) {
    const sp = new URLSearchParams(params.toString());
    sp.delete("page");
    sp.delete("cursor");
    if (nextFrom && nextTo) {
      sp.set("from", nextFrom);
      sp.set("to", nextTo);
    } else {
      sp.delete("from");
      sp.delete("to");
    }
    const qs = sp.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  function preset(fromKey, toKey) {
    setFrom(fromKey);
    setTo(toKey);
    apply(fromKey, toKey);
  }

  const presets = [
    { label: "امروز", from: today, to: today },
    { label: "دیروز", from: shiftDayKey(today, -1), to: shiftDayKey(today, -1) },
    { label: "۷ روز اخیر", from: shiftDayKey(today, -6), to: today },
    { label: "۳۰ روز اخیر", from: shiftDayKey(today, -29), to: today },
  ];

  const active = Boolean(urlFrom && urlTo);
  const canApply = Boolean(from && to) && (from !== urlFrom || to !== urlTo);
  const invalidOrder = from && to && from > to;

  return (
    <div className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-soft sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
          <FaCalendarAlt size={12} className="text-green-600" />
          {title}
          {pending && <Spinner className="text-green-600" />}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {presets.map((p) => {
            const isActive = urlFrom === p.from && urlTo === p.to;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => preset(p.from, p.to)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  isActive ? "bg-green-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-800"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <JalaliDayPicker label="از تاریخ" value={from} onChange={setFrom} />
        <JalaliDayPicker label="تا تاریخ" value={to} onChange={setTo} />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canApply || invalidOrder || pending}
            onClick={() => apply(from, to)}
            className={cn(buttonVariants({ size: "sm" }), "")}
          >
            اعمال
          </button>
          {active && !defaultToday && (
            <button
              type="button"
              onClick={() => {
                setFrom("");
                setTo("");
                apply("", "");
              }}
              className="flex h-10 items-center gap-1 rounded-lg px-3 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            >
              <FaTimes size={10} /> حذف فیلتر
            </button>
          )}
        </div>
      </div>

      {invalidOrder && <p className="mt-2 text-xs text-red-600">تاریخ «از» باید قبل از «تا» باشد.</p>}
      {active && (
        <p className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-500">
          {urlFrom === urlTo
            ? `نمایش: ${formatJalaliKey(urlFrom)}`
            : `نمایش: ${formatJalaliKey(urlFrom)} تا ${formatJalaliKey(urlTo)}`}
          <span className="text-slate-400"> (حداکثر {toFaDigits(MAX_RANGE_DAYS)} روز)</span>
        </p>
      )}
    </div>
  );
}
