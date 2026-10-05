"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaSearch, FaTimes } from "react-icons/fa";

/**
 * کادر جست‌وجوی هدر: با تایپ، پیشنهاد محصول نشون می‌ده (کیبورد: ↑ ↓ Enter Esc)،
 * با Enter یا دکمه‌ی جست‌وجو می‌ره به /products?q=... و مقدار فعلی جست‌وجو رو نگه می‌داره.
 */
export default function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("q") ?? "";
  const listId = useId();
  const wrapRef = useRef(null);

  const [value, setValue] = useState(current);
  const [prevCurrent, setPrevCurrent] = useState(current);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // با عوض‌شدن q در URL (مثلاً دکمه‌ی عقب مرورگر) مقدار کادر هم هماهنگ می‌شه
  if (current !== prevCurrent) {
    setPrevCurrent(current);
    setValue(current);
  }

  const term = value.trim();
  const showList = open && term.length >= 2 && items.length > 0;

  // دریافت پیشنهادها با مکث کوتاه؛ درخواست قبلی با تایپ جدید لغو می‌شه
  useEffect(() => {
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const data = await res.json();
        if (data?.ok) {
          setItems(data.products);
          setActive(-1);
        }
      } catch {}
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [term]);

  function search(text) {
    const q = text.trim();
    setOpen(false);
    router.push(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  }

  function onSubmit(e) {
    e.preventDefault();
    search(active >= 0 && showList ? items[active].name : value);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") return setOpen(false);
    if (!showList) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    }
  }

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
            setItems([]);
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
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[60dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-pop"
        >
          {items.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => {
                  setValue(p.name);
                  search(p.name);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-start transition ${
                  i === active ? "bg-green-50" : ""
                }`}
              >
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                  {p.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-800">{p.name}</span>
                  {p.category && <span className="block truncate text-xs text-slate-400">در {p.category}</span>}
                </span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="submit"
              onMouseDown={(e) => e.preventDefault()}
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-green-700 transition hover:bg-green-50"
            >
              <FaSearch size={12} />
              نمایش همه‌ی نتایج «{term}»
            </button>
          </li>
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
