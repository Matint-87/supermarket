"use client";

import Link from "next/link";
import { FaShoppingCart } from "react-icons/fa";
import { formatNumber } from "@/lib/format";
import { useCart } from "./useCart";

/** آیکن سبد خرید هدر با شمارنده‌ی تعداد کالاها */
export default function CartButton() {
  const { count, ready } = useCart();
  const shown = ready && count > 0;

  return (
    <Link
      href="/cart"
      aria-label={shown ? `سبد خرید، ${formatNumber(count)} کالا` : "سبد خرید"}
      className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-green-50 hover:text-green-700"
    >
      <FaShoppingCart size={18} />
      {shown && (
        <span className="absolute -end-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
          {count > 99 ? "+۹۹" : formatNumber(count)}
        </span>
      )}
    </Link>
  );
}
