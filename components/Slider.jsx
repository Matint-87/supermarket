"use client";

import Link from "next/link";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";

/**
 * اسلایدر افقی محصولات (شیء محصول همون خروجی /api/products).
 * products = null یعنی هنوز در حال لود → اسکلتون نشون می‌ده.
 */
export default function Slider({ title, href = "/products", products }) {
  const [prevEl, setPrevEl] = useState(null);
  const [nextEl, setNextEl] = useState(null);

  if (products && products.length === 0) return null;

  return (
    <section dir="rtl" className="py-4">
      <Reveal from="right" className="mb-4 flex items-center justify-between px-4">
        <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-800">
          <span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-linear-to-b from-green-400 to-green-700" />
          {title}
        </h2>
        <Link
          href={href}
          className="rounded-full bg-white px-6 py-2 text-sm font-bold text-slate-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-green-50 hover:text-green-700 hover:ring-green-300"
        >
          همه
        </Link>
      </Reveal>

      {!products ? (
        <div className="flex gap-3 overflow-hidden px-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 w-40 shrink-0 rounded-2xl bg-slate-100 lg:w-56" />
          ))}
        </div>
      ) : (
        <Reveal from="left" delay={120} className="relative">
          <Swiper
            dir="rtl"
            modules={[Navigation, FreeMode]}
            navigation={{ prevEl, nextEl }}
            freeMode
            spaceBetween={12}
            slidesPerView={2.4}
            slidesOffsetBefore={16}
            slidesOffsetAfter={16}
            breakpoints={{
              340: { slidesPerView: 2.1 },
              640: { slidesPerView: 3.4 },
              1024: { slidesPerView: 5 },
              1536: { slidesPerView: 6 },
            }}
            className="pb-3!"
          >
            {products.map((p) => (
              <SwiperSlide key={p.id} className="h-auto!">
                <ProductCard product={p} compact />
              </SwiperSlide>
            ))}
          </Swiper>

          <button
            ref={setPrevEl}
            aria-label="قبلی"
            className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-green-700 hover:text-white disabled:opacity-0 sm:flex"
          >
            <FaChevronRight size={14} />
          </button>
          <button
            ref={setNextEl}
            aria-label="بعدی"
            className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-green-700 hover:text-white disabled:opacity-0 sm:flex"
          >
            <FaChevronLeft size={14} />
          </button>
        </Reveal>
      )}
    </section>
  );
}
