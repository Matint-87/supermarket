import Link from "next/link";
import { FaHome, FaSearch, FaShoppingBasket } from "react-icons/fa";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "صفحه پیدا نشد | سوپرمارکت رحیمی" };

/** صفحه‌ی ۴۰۴ برای کل سایت (هر آدرسی که وجود نداشته باشه یا notFound() صدا زده بشه) */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 font-[Number] text-slate-800">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        <div className="relative mb-6">
          <span aria-hidden="true" className="absolute -inset-6 rounded-full bg-green-100/70 blur-2xl" />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-linear-to-br from-green-500 to-green-700 text-white shadow-brand">
            <FaShoppingBasket size={44} />
          </span>
        </div>

        <p className="text-6xl font-extrabold tracking-tight text-green-700 md:text-7xl">۴۰۴</p>
        <h1 className="mt-3 text-xl font-extrabold text-slate-800 md:text-2xl">صفحه‌ای که دنبالش بودید پیدا نشد</h1>
        <p className="mt-2 max-w-md text-sm leading-7 text-slate-500">
          ممکنه آدرس اشتباه وارد شده باشه یا این صفحه جابه‌جا یا حذف شده باشه. از لینک‌های زیر ادامه بدید.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className={cn(buttonVariants({ size: "default" }), "flex")}
          >
            <FaHome size={14} />
            بازگشت به صفحه‌ی اصلی
          </Link>
          <Link
            href="/products"
            className={cn(buttonVariants({ variant: "outline", size: "default" }), "flex")}
          >
            <FaSearch size={13} />
            مشاهده‌ی محصولات
          </Link>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
