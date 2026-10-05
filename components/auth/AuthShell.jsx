import Link from "next/link";
import { FaShoppingBasket } from "react-icons/fa";

/** قاب مشترک صفحه‌های ورود/تکمیل اطلاعات: لوگو + کارت وسط صفحه (با پس‌زمینه‌ی گرادیانی ملایم).
 *  دکمه‌ی بازگشت داخل خودِ کارت فرم‌ها قرار می‌گیره (BackButton variant="inline"). */
export default function AuthShell({ children, wide = false }) {
  return (
    <div className="min-h-dvh bg-linear-to-b from-green-50 via-slate-50 to-slate-50 font-[Number] text-slate-800">
      <div className={`mx-auto w-full px-4 py-6 sm:py-10 ${wide ? "max-w-2xl" : "max-w-md"}`}>
        <Link href="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-green-500 to-green-700 text-white shadow-brand">
            <FaShoppingBasket size={22} />
          </span>
          <span className="text-xl font-extrabold tracking-tight text-green-800">سوپرمارکت رحیمی</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
