"use client";
import { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode, Grid } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/grid";
import "swiper/css/navigation";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Reveal from "@/components/Reveal";

/**
 * قفسه‌ی «شگفت‌انگیز» (دو ردیفه). products همون خروجی /api/products؛ null یعنی در حال لود.
 * اگه محصولی تخفیف‌دار نباشه، کل بخش نمایش داده نمی‌شه.
 */
export default function AmazingOffers({ title = "شگفت‌انگیز", href = "/products?discounted=1", products }) {
  const [prevEl, setPrevEl] = useState(null);
  const [nextEl, setNextEl] = useState(null);

  if (products && products.length === 0) return null;

  return (
    <section
      dir="rtl"
      className="relative mt-6 rounded-3xl bg-linear-to-b from-green-600 via-green-400 to-green-200 pb-4 shadow-lg"
    >
      {/* سایه‌بون راه‌راه: از بالا پایین می‌افته */}
      <Reveal
        from="top"
        aria-hidden="true"
        className="flex h-12 overflow-hidden rounded-t-3xl [clip-path:polygon(3%_0,97%_0,100%_100%,0_100%)]"
      >
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className={`h-full flex-1 rounded-b-3xl ${i % 2 ? "bg-white" : "bg-green-400"}`} />
        ))}
      </Reveal>

      {/* عنوان درخشان: با کمی تأخیر زوم می‌شه */}
      <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2">
        <Reveal
          as="h2"
          from="zoom"
          delay={250}
          className="rounded-2xl border-[3px] border-dotted bg-linear-to-b from-green-500 to-green-700 px-5 py-2 text-base font-extrabold sm:px-7 sm:text-xl text-white shadow-[0_0_22px_rgba(51,104,160,0.75)]"
        >
          {title}
        </Reveal>
      </div>

      {/* کارت‌های محصول از پایین بالا میان */}
      <Reveal from="bottom" delay={200} className="relative mt-4 px-3">
        {!products ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-60 rounded-2xl bg-white/40" />
            ))}
          </div>
        ) : (
          <>
            <Swiper
              modules={[Navigation, FreeMode, Grid]}
              navigation={{ prevEl, nextEl }}
              freeMode
              // با کمتر از ۴ محصول دو ردیف بی‌معنیه
              grid={{ rows: products.length > 3 ? 2 : 1, fill: "row" }}
              spaceBetween={10}
              slidesPerView={2.2}
              breakpoints={{
                640: { slidesPerView: 3.4 },
                1024: { slidesPerView: 5 },
                1280: { slidesPerView: 6 },
              }}
              className={products.length > 3 ? "h-144" : "h-72"}
            >
              {products.map((p) => (
                <SwiperSlide key={p.id}>
                  <ProductCard product={p} compact />
                </SwiperSlide>
              ))}
            </Swiper>

            <button
              ref={setPrevEl}
              aria-label="قبلی"
              className="absolute right-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-green-700 shadow-md transition hover:bg-green-700 hover:text-white disabled:opacity-0 sm:flex"
            >
              <FaChevronRight size={14} />
            </button>
            <button
              ref={setNextEl}
              aria-label="بعدی"
              className="absolute left-1 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white text-green-700 shadow-md transition hover:bg-green-700 hover:text-white disabled:opacity-0 sm:flex"
            >
              <FaChevronLeft size={14} />
            </button>
          </>
        )}
      </Reveal>

      <Reveal from="bottom" delay={150} className="mx-3 mt-4">
        <Link href={href} className={cn(buttonVariants({ size: "lg" }), "flex w-full")}>
          همه کالاهای {title}
          <FaChevronLeft size={12} />
        </Link>
      </Reveal>
    </section>
  );
}
