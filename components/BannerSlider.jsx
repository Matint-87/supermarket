"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

/** هر بنر ممکنه لینک داخلی (/products)، لینک بیرونی (https://…) یا هیچ لینکی نداشته باشه */
function BannerImage({ banner, priority }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={banner.imageUrl}
      alt={banner.title}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      draggable={false}
      className="h-full w-full object-cover"
    />
  );
}

function BannerLink({ banner, children }) {
  const cls = "block h-full w-full";
  if (!banner.linkUrl) return <div className={cls}>{children}</div>;
  if (banner.linkUrl.startsWith("/")) {
    return (
      <Link href={banner.linkUrl} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  );
}

const navBtn =
  "absolute top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-md transition hover:bg-green-700 hover:text-white disabled:opacity-0 md:flex";

/** اسلایدر بنرهای صفحه‌ی اصلی (مدیریت از پنل ادمین) */
export default function BannerSlider({ banners }) {
  const [prevEl, setPrevEl] = useState(null);
  const [nextEl, setNextEl] = useState(null);
  // کاربری که «کاهش حرکت» رو در سیستمش روشن کرده، چرخش خودکار نمی‌بینه
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  if (!banners?.length) return null;
  const multiple = banners.length > 1;

  return (
    <section dir="rtl" aria-label="بنرهای تبلیغاتی" className="mx-auto max-w-7xl px-4 pt-6">
      <div className="banner-in relative overflow-hidden rounded-3xl bg-slate-100 shadow-soft">
        <Swiper
          dir="rtl"
          modules={[Autoplay, Navigation, Pagination]}
          navigation={multiple ? { prevEl, nextEl } : false}
          pagination={multiple ? { clickable: true } : false}
          autoplay={multiple && !reduceMotion ? { delay: 5000, disableOnInteraction: false, pauseOnMouseEnter: true } : false}
          rewind={multiple}
          allowTouchMove={multiple}
          className="aspect-20/7 w-full"
          style={{
            "--swiper-theme-color": "#ffffff",
            "--swiper-pagination-bullet-inactive-color": "#ffffff",
            "--swiper-pagination-bullet-inactive-opacity": "0.55",
            "--swiper-pagination-bullet-size": "7px",
          }}
        >
          {banners.map((b, i) => (
            <SwiperSlide key={b.id}>
              <BannerLink banner={b}>
                <BannerImage banner={b} priority={i === 0} />
              </BannerLink>
            </SwiperSlide>
          ))}
        </Swiper>

        {multiple && (
          <>
            <button ref={setPrevEl} aria-label="بنر قبلی" className={`${navBtn} right-3`}>
              <FaChevronRight size={14} />
            </button>
            <button ref={setNextEl} aria-label="بنر بعدی" className={`${navBtn} left-3`}>
              <FaChevronLeft size={14} />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
