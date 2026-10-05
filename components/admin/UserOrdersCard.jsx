"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaSearch, FaTimes } from "react-icons/fa";
import { JalaliDayPicker } from "@/components/admin/DateRangeFilter";
import { Card, OrderStatusBadge, theadRowCls, trCls } from "@/components/admin/ui";
import { Spinner } from "@/components/ui/form";
import { Select } from "@/components/ui/select";
import { USER_ORDERS_PAGE_SIZES } from "@/lib/admin-constants";
import { api } from "@/lib/api-client";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDate, formatJalaliKey, shiftDayKey, tehranTodayKey } from "@/lib/jalali";
import { toEnglishDigits, toFaDigits } from "@/lib/phone";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 400;

/** شماره‌ی صفحه‌ها به‌صورت فشرده: ۱ … ۴ ۵ ۶ … ۱۰ */
function pageList(current, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (current >= pages - 2) [pages - 1, pages - 2, pages - 3].forEach((n) => set.add(n));
  const sorted = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

/**
 * سفارش‌های یک کاربر توی پنل مدیریت: جست‌وجوی کد سفارش + فیلتر بازه‌ی روز (شمسی) + صفحه‌بندی شماره‌ای (۱۰ یا ۲۰ تایی).
 * صفحه‌ی اول از سرور می‌آد (initial)؛ بقیه با هر تغییر فیلتر/صفحه از API گرفته می‌شن.
 */
export default function UserOrdersCard({ userId, initial }) {
  const [data, setData] = useState(initial);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(initial.size ?? USER_ORDERS_PAGE_SIZES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cardRef = useRef(null);
  const firstRun = useRef(true);

  // فیلتر روز فقط وقتی هر دو سر بازه انتخاب شده و ترتیبشون درسته اعمال می‌شه
  const rangeOk = Boolean(from && to && from <= to);
  const appliedFrom = rangeOk ? from : "";
  const appliedTo = rangeOk ? to : "";
  const invalidOrder = Boolean(from && to && from > to);
  const filtersActive = Boolean(appliedQ || appliedFrom);

  // جست‌وجو با مکث کوتاه بعد از تایپ
  useEffect(() => {
    const t = setTimeout(() => {
      setAppliedQ(toEnglishDigits(q.trim()));
      setPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    // صفحه‌ی اول با فیلتر خالی رو سرور داده؛ درخواست اضافه نمی‌خوایم
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const ctrl = new AbortController();
    const sp = new URLSearchParams({ page: String(page), size: String(size) });
    if (appliedQ) sp.set("q", appliedQ);
    if (appliedFrom) {
      sp.set("from", appliedFrom);
      sp.set("to", appliedTo);
    }
    setLoading(true);
    setError("");
    api("GET", `/api/admin/users/${userId}/orders?${sp}`)
      .then((d) => {
        if (ctrl.signal.aborted) return;
        setData({ items: d.orders, total: d.total, page: d.page, pages: d.pages, size: d.size });
        if (d.page !== page) setPage(d.page);
      })
      .catch((err) => !ctrl.signal.aborted && setError(err.message || "دریافت سفارش‌ها با خطا مواجه شد"))
      .finally(() => !ctrl.signal.aborted && setLoading(false));
    return () => ctrl.abort();
  }, [userId, appliedQ, appliedFrom, appliedTo, page, size]);

  function goTo(n) {
    setPage(n);
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearAll() {
    setQ("");
    setAppliedQ("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function preset(fromKey, toKey) {
    setFrom(fromKey);
    setTo(toKey);
    setPage(1);
  }

  const today = tehranTodayKey();
  const presets = [
    { label: "امروز", from: today, to: today },
    { label: "۷ روز اخیر", from: shiftDayKey(today, -6), to: today },
    { label: "۳۰ روز اخیر", from: shiftDayKey(today, -29), to: today },
  ];

  const { items, total, pages } = data;
  const current = data.page ?? page;
  const firstIdx = total === 0 ? 0 : (current - 1) * size + 1;
  const lastIdx = Math.min(total, current * size);

  return (
    <div ref={cardRef} className="scroll-mt-20">
      <Card title={`سفارش‌ها (${formatNumber(total)})`}>
        {/* جست‌وجو */}
        <div className="relative mb-3">
          <FaSearch size={13} aria-hidden="true" className="pointer-events-none absolute inset-s-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جست‌وجو با کد سفارش…"
            aria-label="جست‌وجوی کد سفارش"
            inputMode="numeric"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-10 pe-10 text-sm outline-none transition placeholder:text-slate-400 hover:border-green-300 focus:border-green-600 focus:ring-4 focus:ring-green-600/15 [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              aria-label="پاک‌کردن جست‌وجو"
              onClick={() => setQ("")}
              className="absolute inset-e-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <FaTimes size={11} />
            </button>
          )}
        </div>

        {/* فیلتر روز */}
        <div className="mb-4 rounded-2xl bg-slate-50 p-3">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <FaCalendarAlt size={12} className="text-green-600" /> فیلتر تاریخ سفارش
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {presets.map((p) => {
                const on = from === p.from && to === p.to;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => preset(p.from, p.to)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      on ? "bg-green-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-green-100 hover:text-green-800"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <JalaliDayPicker label="از تاریخ" value={from} onChange={(v) => { setFrom(v); setPage(1); }} />
            <JalaliDayPicker label="تا تاریخ" value={to} onChange={(v) => { setTo(v); setPage(1); }} />
            {(from || to) && (
              <button
                type="button"
                onClick={() => preset("", "")}
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "flex")}
              >
                <FaTimes size={10} /> حذف فیلتر
              </button>
            )}
          </div>
          {invalidOrder && <p className="mt-2 text-xs text-red-600">تاریخ «از» باید قبل از «تا» باشد.</p>}
          {appliedFrom && (
            <p className="mt-2 text-xs text-slate-500">
              {appliedFrom === appliedTo ? `نمایش: ${formatJalaliKey(appliedFrom)}` : `نمایش: ${formatJalaliKey(appliedFrom)} تا ${formatJalaliKey(appliedTo)}`}
            </p>
          )}
        </div>

        {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-600">{error}</p>}

        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {filtersActive ? (
              <>
                <p>سفارشی با این جست‌وجو یا فیلتر پیدا نشد.</p>
                <button type="button" onClick={clearAll} className="mt-3 rounded-full bg-white px-4 py-1.5 font-bold text-green-700 ring-1 ring-green-200 hover:bg-green-50">
                  پاک‌کردن همه‌ی فیلترها
                </button>
              </>
            ) : (
              <p>این کاربر هنوز سفارشی ثبت نکرده.</p>
            )}
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${loading ? "opacity-50" : ""}`}>
            <table className="w-full min-w-[480px] text-start text-xs">
              <thead>
                <tr className={theadRowCls}>
                  <th className="py-2.5 ps-3 pe-3 font-medium">کد سفارش</th>
                  <th className="py-2.5 pe-3 font-medium">تاریخ</th>
                  <th className="py-2.5 pe-3 font-medium">مبلغ</th>
                  <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => (
                  <tr key={o.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3">
                      <Link href={`/admin/orders/${o.code}`} className="font-medium text-slate-800 hover:text-green-700" dir="ltr">
                        {toFaDigits(o.code)}
                      </Link>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatJalaliDate(o.createdAt)}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatToman(o.payable)}</td>
                    <td className="py-2.5 pe-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* صفحه‌بندی */}
        {total > 0 && (
          <div className="mt-4 flex flex-col items-center gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                {loading && <Spinner className="text-green-600" />}
                {formatNumber(firstIdx)} تا {formatNumber(lastIdx)} از {formatNumber(total)} سفارش
              </span>
              <span className="flex items-center gap-1.5">
                تعداد در صفحه:
                <Select
                  value={String(size)}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(1);
                  }}
                  aria-label="تعداد سفارش در هر صفحه"
                  className="h-8 w-[4.5rem] rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none transition hover:border-green-300 focus:border-green-600"
                >
                  {USER_ORDERS_PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {toFaDigits(n)}
                    </option>
                  ))}
                </Select>
              </span>
            </div>

            {pages > 1 && (
              <nav aria-label="صفحه‌بندی سفارش‌ها" className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={current <= 1 || loading}
                  onClick={() => goTo(current - 1)}
                  aria-label="صفحه‌ی قبل"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FaChevronRight size={11} />
                </button>
                {pageList(current, pages).map((n, i) =>
                  n === "…" ? (
                    <span key={`gap${i}`} className="px-1 text-slate-400">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      disabled={loading}
                      onClick={() => goTo(n)}
                      aria-current={n === current ? "page" : undefined}
                      className={`h-8 min-w-8 rounded-lg px-2 text-xs font-medium transition ${
                        n === current ? "bg-green-700 text-white shadow-sm" : "text-slate-600 ring-1 ring-slate-200 hover:bg-green-50"
                      }`}
                    >
                      {formatNumber(n)}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  disabled={current >= pages || loading}
                  onClick={() => goTo(current + 1)}
                  aria-label="صفحه‌ی بعد"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FaChevronLeft size={11} />
                </button>
              </nav>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
