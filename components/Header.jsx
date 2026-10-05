import Link from "next/link";
import { Suspense } from "react";
import { FaShoppingBasket } from "react-icons/fa";
import AuthButton from "@/components/auth/AuthButton";
import CartButton from "@/components/cart/CartButton";
import SearchBox, { SearchBoxFallback } from "@/components/SearchBox";
import BackButton from "@/components/BackButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-100 border-b border-slate-200/80 bg-slate-50/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-4 sm:px-4 sm:py-3">
        {/* دکمه‌ی بازگشت: توی همه‌ی صفحه‌ها جز صفحه‌ی اصلی */}
        <BackButton />

        {/* لوگو: کاشی گرادیانی + نام فروشگاه */}
        <Link href="/" className="hidden shrink-0 items-center gap-2.5 md:flex">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-green-500 to-green-700 text-white shadow-brand">
            <FaShoppingBasket size={20} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-green-800 sm:text-xl">
            سوپرمارکت رحیمی
          </span>
        </Link>

        {/* useSearchParams داخل SearchBox هست، پس Suspense لازمه تا صفحه‌ها همچنان استاتیک بمونن */}
        <Suspense fallback={<SearchBoxFallback />}>
          <SearchBox />
        </Suspense>

        <div className="ms-auto hidden items-center gap-2 md:ms-0 md:flex">
          <AuthButton />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
