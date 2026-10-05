"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { FaShoppingBasket, FaThLarge } from "react-icons/fa";
import { api } from "@/lib/api-client";
import Reveal from "@/components/Reveal";

// رنگ پس‌زمینه‌ی دایره‌ها؛ به‌ترتیب روی دسته‌ها می‌چرخه
const BGS = [
  "bg-orange-100",
  "bg-indigo-100",
  "bg-sky-100",
  "bg-pink-100",
  "bg-amber-100",
  "bg-rose-100",
  "bg-green-100",
  "bg-red-100",
  "bg-lime-100",
  "bg-violet-100",
  "bg-emerald-100",
  "bg-yellow-100",
];

const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
      <path d='M60 140l28-36 22 26 16-18 24 28z' fill='#ffffff' fill-opacity='.7'/>
      <circle cx='78' cy='76' r='12' fill='#ffffff' fill-opacity='.7'/>
    </svg>`
  );

function LazyImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete) {
      if (el.naturalWidth === 0) setFailed(true);
      setLoaded(true);
    }
  }, []);

  return (
    <>
      {!loaded && <span className="absolute inset-0 animate-pulse bg-white/60" />}
      <img
        ref={imgRef}
        src={failed ? PLACEHOLDER : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={`absolute inset-0 h-full w-full object-contain p-2.5 transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
    </>
  );
}

function ShelfItem({ category, bg, index }) {
  return (
    // با کلیک، صفحه‌ی محصولات با همون دسته باز می‌شه. هر دایره کمی دیرتر از قبلی ظاهر می‌شه (حداکثر ۹ پله)
    <Reveal from="zoom" delay={Math.min(index, 9) * 55}>
      <Link href={`/products?category=${category.id}`} className="group flex flex-col items-center gap-2.5 lg:gap-3">
        <span
          className={`relative block aspect-square w-full max-w-24 overflow-hidden rounded-full shadow-sm ring-1 ring-black/5 transition duration-300 group-hover:scale-105 group-hover:shadow-md lg:max-w-28 2xl:max-w-32 ${bg}`}
        >
          {category.imageUrl ? (
            <LazyImage src={category.imageUrl} alt={category.name} />
          ) : (
            // دسته‌ای که هنوز عکس نداره
            <span className="absolute inset-0 flex items-center justify-center text-green-700/60">
              <FaShoppingBasket size={30} />
            </span>
          )}
        </span>

        <span className="text-center text-xs font-medium leading-5 text-slate-700 transition-colors group-hover:text-green-700 lg:text-[13px] lg:leading-6">
          {category.name}
        </span>
      </Link>
    </Reveal>
  );
}

function ShelvesSkeleton() {
  return Array.from({ length: 9 }).map((_, i) => (
    <div key={i} className="flex flex-col items-center gap-2.5">
      <span className="aspect-square w-full max-w-24 animate-pulse rounded-full bg-slate-100 lg:max-w-28" />
      <span className="h-3 w-14 animate-pulse rounded bg-slate-100" />
    </div>
  ));
}

/** قفسه‌ها = دسته‌بندی‌هایی که تو پنل ادمین می‌سازی (اسم + عکس آیکن همون دسته) */
export default function Shelves() {
  const [categories, setCategories] = useState(null); // null یعنی در حال لود

  useEffect(() => {
    let alive = true;
    api("GET", "/api/categories")
      .then((d) => alive && setCategories(d.categories))
      .catch(() => alive && setCategories([]));
    return () => {
      alive = false;
    };
  }, []);

  // اگه هیچ دسته‌ای نیست کل بخش مخفی می‌شه
  if (categories && categories.length === 0) return null;

  return (
    <section dir="rtl" className="bg-slate-50 px-4 py-5 lg:px-6 lg:py-8">
      <Reveal from="bottom" className="mx-auto max-w-[1280px] lg:rounded-3xl lg:bg-white lg:px-10 lg:py-8 lg:shadow-sm lg:ring-1 lg:ring-slate-200">
        <h2 className="mb-5 flex items-center gap-2 text-sm font-bold text-slate-800 lg:mb-8 lg:text-lg">
          <FaThLarge size={16} className="text-slate-700 lg:h-5 lg:w-5" />
          قفسه‌ها
        </h2>

        <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-6 lg:grid-cols-9 lg:gap-x-6 lg:gap-y-10">
          {!categories ? (
            <ShelvesSkeleton />
          ) : (
            categories.map((c, i) => <ShelfItem key={c.id} category={c} bg={BGS[i % BGS.length]} index={i} />)
          )}
        </div>
      </Reveal>
    </section>
  );
}
