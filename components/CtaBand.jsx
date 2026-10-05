import Link from "next/link";
import { FaChevronLeft, FaShoppingBasket } from "react-icons/fa";
import Reveal from "@/components/Reveal";

/** نوار دعوت به خرید آخر صفحه؛ متن از راست و آیکن از چپ وارد می‌شه */
export default function CtaBand() {
  return (
    <section
      dir="rtl"
      className="relative overflow-hidden rounded-3xl bg-linear-to-br from-green-600 via-green-700 to-green-900 px-6 py-8 text-white shadow-brand md:px-12 md:py-10"
    >
      <span aria-hidden="true" className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10" />

      <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <Reveal from="right">
          <h2 className="text-xl font-extrabold leading-snug md:text-2xl">سبد خریدت رو امروز پر کن</h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-green-100">
            از قفسه‌ها و کالاهای شگفت‌انگیز شروع کن؛ هر وقت آماده بودی سفارش رو ثبت کن.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-bold text-green-800 shadow-sm transition hover:bg-green-50 active:scale-[0.98]"
          >
            شروع خرید
            <FaChevronLeft size={12} />
          </Link>
        </Reveal>

        <Reveal from="left" delay={120} className="hidden md:block">
          <span
            aria-hidden="true"
            className="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/25"
          >
            <FaShoppingBasket size={52} className="text-white/90" />
          </span>
        </Reveal>
      </div>
    </section>
  );
}
