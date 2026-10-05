import Link from "next/link";
import {
  FaAppleAlt,
  FaBreadSlice,
  FaCarrot,
  FaCheese,
  FaFish,
  FaPercent,
  FaShoppingBasket,
  FaTruck,
} from "react-icons/fa";

// آیکن‌های شناور دور سبد (فقط دسکتاپ). موقعیت‌ها با درصد از کادر هنر؛ delay باعث می‌شه هم‌زمان بالا و پایین نرن
const FLOATERS = [
  { icon: FaAppleAlt, pos: "top-[4%] right-[8%]", size: "h-14 w-14", delay: "0s" },
  { icon: FaCarrot, pos: "top-[30%] -left-2", size: "h-12 w-12", delay: "-1.4s" },
  { icon: FaBreadSlice, pos: "bottom-[6%] right-[2%]", size: "h-14 w-14", delay: "-2.8s" },
  { icon: FaCheese, pos: "bottom-[2%] left-[16%]", size: "h-12 w-12", delay: "-4.1s" },
  { icon: FaFish, pos: "top-[0%] left-[30%]", size: "h-11 w-11", delay: "-0.7s" },
];

/** هیرو صفحه‌ی اصلی؛ درست زیر هدر. استاتیکه و ورودش فقط با CSS انجام می‌شه (بدون کلاینت‌کامپوننت) */
export default function Hero() {
  return (
    <section dir="rtl" className="mx-auto max-w-7xl px-4 pt-6">
      <div className="banner-in relative overflow-hidden rounded-3xl bg-linear-to-br from-green-600 via-green-700 to-green-900 px-6 py-10 text-white shadow-brand md:px-12 md:py-16">
        {/* دایره‌های تزئینی؛ با اسکرول با سرعت‌های مختلف بالا می‌رن (پارالاکس) */}
        <span
          aria-hidden="true"
          className="parallax-slow absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 md:h-64 md:w-64"
        />
        <span
          aria-hidden="true"
          className="parallax-fast absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-green-300/20 md:h-56 md:w-56"
        />

        <div className="relative flex items-center justify-between gap-10">
          <div className="max-w-xl">
            <span
              className="hero-in inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur"
              style={{ "--hero-delay": "80ms" }}
            >
              <FaTruck size={13} />
              ارسال سریع به درب منزل
            </span>

            <h1
              className="hero-in mt-4 text-3xl font-extrabold leading-snug md:text-5xl md:leading-snug"
              style={{ "--hero-delay": "200ms" }}
            >
              خرید تازه و به‌صرفه،
              <br />
              هر روز از سوپرمارکت رحیمی
            </h1>

            <p
              className="hero-in mt-4 max-w-md text-sm leading-7 text-green-100 md:text-base md:leading-8"
              style={{ "--hero-delay": "340ms" }}
            >
              از خوراکی و لبنیات تا شوینده، همه‌ی نیازهای خونه رو یک‌جا سفارش بده؛ با قیمت مناسب و ضمانت اصالت کالا.
            </p>

            <div className="hero-in mt-7 flex flex-wrap items-center gap-3" style={{ "--hero-delay": "480ms" }}>
              <Link
                href="/products"
                className="inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-green-800 shadow-sm transition hover:bg-green-50 active:scale-[0.98]"
              >
                مشاهده‌ی محصولات
              </Link>
              <Link
                href="/products?discounted=1"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white/15 px-6 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25 active:scale-[0.98]"
              >
                <FaPercent size={12} />
                کالاهای شگفت‌انگیز
              </Link>
            </div>
          </div>

          {/* هنر سمت چپ (فقط دسکتاپ): سبد وسط + آیکن‌های شناور دورش */}
          <div
            aria-hidden="true"
            className="hero-in relative hidden h-72 w-72 shrink-0 md:block lg:h-80 lg:w-80"
            style={{ "--hero-delay": "320ms" }}
          >
            <span className="absolute inset-6 rounded-full bg-white/10 ring-1 ring-white/20" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-40 w-40 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur lg:h-44 lg:w-44">
                <FaShoppingBasket size={84} className="text-white/95" />
              </span>
            </span>
            {FLOATERS.map(({ icon: Icon, pos, size, delay }, i) => (
              <span
                key={i}
                className={`float-y absolute ${pos} ${size} flex items-center justify-center rounded-full bg-white text-green-700 shadow-pop`}
                style={{ "--float-delay": delay }}
              >
                <Icon size={22} />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
