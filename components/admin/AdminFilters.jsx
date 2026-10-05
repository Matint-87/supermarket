"use client";

import { useEffect, useState, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FaFilter, FaSearch, FaTimes } from "react-icons/fa";
import { Spinner } from "@/components/ui/form";

/**
 * نوار جست‌وجو و فیلتر بالای جدول‌ها. همه‌چیز توی URL نگه داشته می‌شه (q=…&status=…)
 * و صفحه‌ی سرور با همون پارامترها دوباره رندر می‌شه.
 * جست‌وجو زنده‌ست (بعد از مکث کوتاه تایپ)، Enter هم فوری جست‌وجو می‌کنه.
 * selects: [{ name, label, options: [{ value, label }] }]
 */
const DEBOUNCE_MS = 450;

function buildUrl(pathname, params, changes) {
  const sp = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(changes)) {
    if (value) sp.set(key, value);
    else sp.delete(key);
  }
  sp.delete("page"); // با عوض‌شدن فیلتر از صفحه‌ی اول شروع کن
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export default function AdminFilters({ placeholder = "جست‌وجو…", selects = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const urlQ = params.get("q") ?? "";

  // جست‌وجوی زنده: بعد از ۴۵۰ms مکث، مقدار کادر توی URL نوشته می‌شه
  useEffect(() => {
    const value = q.trim();
    if (value === urlQ) return;
    const t = setTimeout(() => {
      startTransition(() => router.replace(buildUrl(pathname, params, { q: value })));
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, urlQ, pathname, params, router]);

  function push(changes) {
    startTransition(() => router.push(buildUrl(pathname, params, changes)));
  }

  function onSubmit(e) {
    e.preventDefault();
    push({ q: q.trim() });
  }

  function clearSearch() {
    setQ("");
    push({ q: "" });
  }

  function reset() {
    setQ("");
    startTransition(() => router.push(pathname));
  }

  // چیپ‌های فیلترِ فعال (هر کدوم با یک کلیک برداشته می‌شه)
  const chips = [];
  if (urlQ) chips.push({ key: "q", label: `جست‌وجو: ${urlQ}`, clear: clearSearch });
  for (const s of selects) {
    const v = params.get(s.name);
    if (!v) continue;
    const opt = s.options.find((o) => o.value === v);
    chips.push({ key: s.name, label: `${s.label}: ${opt?.label ?? v}`, clear: () => push({ [s.name]: "" }) });
  }

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className="mb-4 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-soft sm:p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        {/* کادر جست‌وجوی بزرگ: کل عرض ردیف رو می‌گیره */}
        <div className="relative min-w-full flex-1 sm:min-w-[320px]">
          <FaSearch
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute inset-s-4 top-1/2 -translate-y-1/2 text-green-600"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={placeholder}
            aria-label="جست‌وجو"
            enterKeyHint="search"
            className="h-13 w-full rounded-xl border border-slate-200 bg-slate-50/70 pe-12 ps-11 text-sm outline-none transition placeholder:text-slate-400 hover:border-green-300 focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-600/15 [&::-webkit-search-cancel-button]:hidden"
          />
          <span className="absolute inset-e-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center">
            {pending ? (
              <Spinner className="text-green-600" />
            ) : q ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="پاک‌کردن جست‌وجو"
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700"
              >
                <FaTimes size={12} />
              </button>
            ) : null}
          </span>
        </div>

        {/* فیلترها */}
        {selects.length > 0 && (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-500 lg:flex">
              <FaFilter size={12} /> فیلتر
            </span>
            {selects.map((s) => {
              const active = Boolean(params.get(s.name));
              return (
                <div key={s.name} className="relative min-w-[150px] flex-1 sm:flex-none">
                  <Select
                    value={params.get(s.name) ?? ""}
                    onChange={(e) => push({ [s.name]: e.target.value })}
                    aria-label={s.label}
                    className={`h-13 w-full cursor-pointer appearance-none rounded-xl border px-4 text-sm font-medium outline-none transition focus:ring-4 focus:ring-green-600/15 ${
                      active
                        ? "border-green-600 bg-green-50 text-green-800"
                        : "border-slate-200 bg-white text-slate-600 hover:border-green-300 focus:border-green-600"
                    }`}
                  >
                    <option value="">{s.label}: همه</option>
                    {s.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-400">فیلترهای فعال:</span>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              className="group flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 transition hover:bg-green-200"
            >
              <span className="max-w-[220px] truncate">{c.label}</span>
              <FaTimes size={10} className="text-green-700/60 transition group-hover:text-green-800" />
            </button>
          ))}
          <button type="button" onClick={reset} className="ms-auto text-xs font-medium text-slate-500 underline-offset-4 hover:text-green-700 hover:underline">
            پاک‌کردن همه
          </button>
        </div>
      )}
    </form>
  );
}
