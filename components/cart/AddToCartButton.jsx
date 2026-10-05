"use client";

import { FaMinus, FaPlus, FaRegTrashAlt } from "react-icons/fa";
import { addToCart, removeFromCart, setQty } from "@/lib/cart-store";
import { maxQuantityFor } from "@/lib/product-constants";
import { useStoreStatus } from "@/components/providers/StoreStatusProvider";
import { formatNumber } from "@/lib/format";
import { useCartQty } from "./useCart";

/**
 * دکمه‌ی افزودن به سبد روی کارت محصول:
 * - تعداد صفر → دکمه‌ی گرد «+»
 * - تعداد ≥ ۱ → شمارنده‌ی «+ ۲ −» (با ۱ عدد، دکمه‌ی − می‌شه سطل زباله)
 * - ناموجود → برچسب غیرفعال
 */
export default function AddToCartButton({ product, className = "" }) {
  const qty = useCartQty(product.id);
  const max = maxQuantityFor(product.stock);
  const { guard } = useStoreStatus();

  // اگه فروشگاه بسته باشه، به‌جای افزودن به سبد مودال «فروشگاه تعطیل است» نشون داده می‌شه
  async function handleAdd(next) {
    if (!(await guard())) return;
    next();
  }

  if (max <= 0) {
    return (
      <span className={`rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500 ${className}`}>
        ناموجود
      </span>
    );
  }

  if (qty === 0) {
    return (
      <button
        type="button"
        onClick={() => handleAdd(() => addToCart(product, 1))}
        aria-label={`افزودن ${product.name} به سبد خرید`}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-green-700 text-white shadow-sm hover:bg-green-800 ${className}`}
      >
        <FaPlus size={14} />
      </button>
    );
  }

  const atMax = qty >= max;

  return (
    <div
      role="group"
      aria-label={`تعداد ${product.name} در سبد`}
      className={`flex items-center gap-0.5 rounded-full bg-white p-0.5 shadow-md ring-1 ring-green-700/30 ${className}`}
    >
      <button
        type="button"
        onClick={() => handleAdd(() => setQty(product.id, qty + 1))}
        disabled={atMax}
        aria-label="افزایش تعداد"
        title={atMax ? "به حداکثر موجودی رسیدی" : undefined}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-green-700 text-white hover:bg-green-800 disabled:bg-slate-200 disabled:text-slate-400"
      >
        <FaPlus size={12} />
      </button>

      <span aria-live="polite" className="min-w-7 text-center text-sm font-extrabold text-slate-800">
        {formatNumber(qty)}
      </span>

      <button
        type="button"
        onClick={() => (qty === 1 ? removeFromCart(product.id) : setQty(product.id, qty - 1))}
        aria-label={qty === 1 ? "حذف از سبد" : "کاهش تعداد"}
        className="flex h-9 w-9 items-center justify-center rounded-full text-green-700 hover:bg-green-50"
      >
        {qty === 1 ? <FaRegTrashAlt size={13} className="text-rose-500" /> : <FaMinus size={12} />}
      </button>
    </div>
  );
}
