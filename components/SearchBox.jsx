"use client";

import { Fragment, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaChevronDown, FaChevronUp, FaClock, FaSearch, FaTimes } from "react-icons/fa";
import { highlightParts } from "@/lib/product-search";
import {
  VISIBLE_HISTORY,
  addSearch,
  clearSearches,
  getHistoryServerSnapshot,
  getHistorySnapshot,
  removeSearch,
  subscribeHistory,
} from "@/lib/search-history";

/** متن با هایلایت بخش‌های جورشده با عبارت جست‌وجو */
function Highlight({ text, term }) {
  return highlightParts(text, term).map((part, i) =>
    part.hit ? (
      <mark key={i} className="rounded-sm bg-transparent font-extrabold text-green-700">
        {part.text}
      </mark>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
}

/**
 * کادر جست‌وجوی هدر:
 *  - کادر خالی + فوکوس → «جست‌وجوهای اخیر» (۱۰ تای آخر، هرکدوم قابل حذف، «مشاهده‌ی همه» لیست رو باز می‌کنه، «پاک‌کردن همه»)
 *  - با تایپ → اول جست‌وجوهای اخیرِ هم‌خوان، بعد پیشنهاد محصول (نام/دسته/برند) به ترتیب مرتبط‌بودن، با هایلایت
 *  - کیبورد: ↑ ↓ Enter Esc  ·  Enter یا کلیک → /products?q=... و ذخیره توی تاریخچه
 */
export default function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("q") ?? "";
  const listId = useId();
  const wrapRef = useRef(null);

  const [value, setValue] = useState(current);
  const [prevCurrent, setPrevCurrent] = useState(current);
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [showAll, setShowAll] = useState(false);

  // تاریخچه از localStorage (سمت سرور خالیه، پس hydration ناهماهنگ نمی‌شه)
  const history = useSyncExternalStore(subscribeHistory, getHistorySnapshot, getHistoryServerSnapshot);

  // با عوض‌شدن q در URL (مثلاً دکمه‌ی عقب مرورگر) مقدار کادر هم هماهنگ می‌شه
  if (current !== prevCurrent) {
    setPrevCurrent(current);
    setValue(current);
  }

  const term = value.trim();
  const typing = term.length >= 2;

  // دریافت پیشنهادها با مکث کوتاه؛ درخواست قبلی با تایپ جدید لغو می‌شه
  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        if (data?.ok) {
          setProducts(data.products);
          setActive(-1);
        }
      } catch {}
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  // ردیف‌های لیست باز: حالت خالی = تاریخچه (۱۰ تا یا همه)؛ حالت تایپ = تاریخچه‌ی هم‌خوان (حداکثر ۳) + محصولات
  const lower = term.toLowerCase();
  const historyRows = typing
    ? history.filter((h) => h.toLowerCase().includes(lower) && h.toLowerCase() !== lower).slice(0, 3)
    : showAll
      ? history
      : history.slice(0, VISIBLE_HISTORY);
  const productRows = typing ? products : [];
  const rows = [
    ...historyRows.map((text) => ({ kind: "history", key: `h:${text}`, text })),
    ...productRows.map((p) => ({ kind: "product", key: `p:${p.id}`, text: p.name, product: p })),
  ];
  const showList = open && rows.length > 0;
  const hiddenCount = !typing ? Math.max(history.length - VISIBLE_HISTORY, 0) : 0;

  function search(text) {
    const q = text.trim();
    setOpen(false);
    setShowAll(false);
    if (q) addSearch(q);
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  }

  function onSubmit(e) {
    e.preventDefault();
    search(active >= 0 && showList ? rows[active].text : value);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") return setOpen(false);
    if (e.key === "Delete" && e.shiftKey && showList && rows[active]?.kind === "history") {
      // Shift+Delete: حذف جست‌وجوی انتخاب‌شده با کیبورد
      e.preventDefault();
      removeSearch(rows[active].text);
      setActive(-1);
      return;
    }
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % rows.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? rows.length - 1 : i - 1));
    }
  }

  const sectionTitle = "flex items-center justify-between px-2.5 pb-1 pt-2 text-[11px] font-bold text-slate-400";

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      ref={wrapRef}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget)) setOpen(false);
      }}
      className="relative mx-auto w-full max-w-xl flex-1"
    >
      <FaSearch
        size={18}
        aria-hidden="true"
        className="pointer-events-none absolute inset-s-4 top-1/2 -translate-y-1/2 text-green-600"
      />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        enterKeyHint="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-label="جستجوی محصولات"
        placeholder="جستجو در هزاران محصول از برندهای معتبر ..."
        className="h-12 w-full rounded-full border border-slate-200 bg-white pe-12 ps-12 text-sm shadow-soft outline-none transition placeholder:text-slate-400 hover:border-green-300 focus:border-green-600 focus:ring-4 focus:ring-green-600/15 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="پاک‌کردن"
          onClick={() => {
            setValue("");
            setProducts([]);
            setOpen(true);
            wrapRef.current?.querySelector("input")?.focus();
          }}
          className="absolute inset-e-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <FaTimes size={12} />
        </button>
      )}

      {showList && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-pop"
        >
          {/* عنوان بخش تاریخچه: فقط توی حالت خالی (با دکمه‌ی پاک‌کردن همه) */}
          {!typing && (
            <li role="presentation" className={sectionTitle}>
              <span>جستجوهای اخیر</span>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  clearSearches();
                  setShowAll(false);
                }}
                className="rounded-md px-1.5 py-0.5 text-[11px] font-bold text-red-500 transition hover:bg-red-50"
              >
                پاک‌کردن همه
              </button>
            </li>
          )}

          {rows.map((row, i) => {
            const isActive = i === active;
            const rowCls = `flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2.5 py-2 text-start transition ${
              isActive ? "bg-green-50" : ""
            }`;

            // بین تاریخچه و محصول‌ها یه تیتر کوچیک (فقط وقتی هر دو بخش هست)
            const firstProduct = row.kind === "product" && rows[i - 1]?.kind === "history";
            const heading = firstProduct ? (
              <li role="presentation" className={sectionTitle}>
                <span>محصولات</span>
              </li>
            ) : null;

            if (row.kind === "history") {
              return (
                <li key={row.key} role="option" aria-selected={isActive} className="flex items-center">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      setValue(row.text);
                      search(row.text);
                    }}
                    className={rowCls}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                      <FaClock size={14} aria-hidden="true" />
                    </span>
                    <span className="block min-w-0 flex-1 truncate text-sm text-slate-700">
                      {typing ? <Highlight text={row.text} term={term} /> : row.text}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`حذف «${row.text}» از جستجوهای اخیر`}
                    title="حذف از تاریخچه"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      removeSearch(row.text);
                      setActive(-1);
                    }}
                    className="ms-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <FaTimes size={12} />
                  </button>
                </li>
              );
            }

            const p = row.product;
            const meta = [p.category && `در ${p.category}`, p.brand].filter(Boolean).join(" · ");
            return (
              <Fragment key={row.key}>
                {heading}
                <li role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => {
                    setValue(p.name);
                    search(p.name);
                  }}
                  className={`${rowCls} w-full`}
                >
                  <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                    {p.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      <Highlight text={p.name} term={term} />
                    </span>
                    {meta && <span className="block truncate text-xs text-slate-400">{meta}</span>}
                  </span>
                </button>
                </li>
              </Fragment>
            );
          })}

          {/* «مشاهده‌ی همه»: لیست همین‌جا باز می‌شه (تا ۳۰ جست‌وجوی آخر)؛ کلیک روی هر مورد دوباره جست‌وجو می‌کنه */}
          {!typing && hiddenCount > 0 && (
            <li role="presentation">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowAll((v) => !v)}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-green-50 hover:text-green-700"
              >
                {showAll ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                {showAll ? "نمایش کمتر" : `مشاهده‌ی همه (${history.length})`}
              </button>
            </li>
          )}

          {typing && (
            <li role="presentation">
              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-green-700 transition hover:bg-green-50"
              >
                <FaSearch size={12} />
                نمایش همه‌ی نتایج «{term}»
              </button>
            </li>
          )}
        </ul>
      )}
    </form>
  );
}

/** نسخه‌ی ساده‌ی بدون useSearchParams برای fallback ی Suspense */
export function SearchBoxFallback() {
  return (
    <div className="relative mx-auto w-full max-w-xl flex-1">
      <FaSearch size={18} className="absolute inset-s-4 top-1/2 -translate-y-1/2 text-slate-500" />
      <div className="h-12 w-full rounded-full border border-slate-200 bg-white" />
    </div>
  );
}
