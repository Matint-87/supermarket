"use client";

import Link from "next/link";
import LazyImage from "@/components/LazyImage";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { formatNumber } from "@/lib/format";
import { formatUnitAmount } from "@/lib/product-constants";

const LOW_STOCK_THRESHOLD = 5;

/** کارت محصول — توی گرید صفحه‌ی محصولات و اسلایدرهای صفحه‌ی اصلی (compact: عکس با ارتفاع ثابت برای اسلایدرها) */
export default function ProductCard({ product, compact = false }) {
  const hasDiscount = product.discountPercent > 0;
  const soldOut = product.stock <= 0;
  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-3 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-pop">
      <div className="relative">
        {hasDiscount && !soldOut && (
          <span className="absolute start-0 top-0 z-10 rounded-full bg-linear-to-b from-orange-400 to-orange-600 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
            ٪{formatNumber(product.discountPercent)}
          </span>
        )}
        <Link href={`/products/${product.id}`} tabIndex={-1} aria-hidden="true" className="block">
          <LazyImage
            src={product.imageUrl || ""}
            alt={product.name}
            className={`${compact ? "h-28" : "aspect-square"} w-full rounded-xl bg-slate-50 ${soldOut ? "opacity-50 grayscale" : ""}`}
          />
        </Link>
        <AddToCartButton product={product} className="absolute -bottom-2 end-0 z-10" />
      </div>

      <div className="mt-3 flex flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 min-h-10 text-xs font-medium leading-5 text-slate-700">
          <Link href={`/products/${product.id}`} className="hover:text-green-700">
            {product.name}
          </Link>
        </h3>
        <p className="text-xs text-slate-400">{formatUnitAmount(product.amount, product.unit)}</p>

        {lowStock && (
          <p className="text-xs font-medium text-rose-500">تنها {formatNumber(product.stock)} عدد در انبار</p>
        )}

        <div className="mt-auto pt-1">
          {hasDiscount && (
            <del className="block text-xs text-slate-400">{formatNumber(product.price)}</del>
          )}
          <span className={`text-[15px] font-extrabold ${soldOut ? "text-slate-400" : "text-slate-800"}`}>
            {formatNumber(product.finalPrice)}
            <span className="ms-1 text-[11px] font-medium text-slate-500">تومان</span>
          </span>
        </div>
      </div>
    </article>
  );
}
