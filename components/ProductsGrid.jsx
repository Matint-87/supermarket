"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FaSearch } from "react-icons/fa";
import { api } from "@/lib/api-client";
import { PRODUCTS_PAGE_SIZE } from "@/lib/product-constants";
import ProductCard from "@/components/ProductCard";
import { useToastOnChange } from "@/lib/toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";

async function fetchProducts({ cursor, categoryId, q, discounted }) {
  const params = new URLSearchParams({ limit: String(PRODUCTS_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  if (categoryId) params.set("categoryId", categoryId);
  if (q) params.set("q", q);
  if (discounted) {
    params.set("discounted", "1");
    params.set("sort", "discount");
  }
  return api("GET", `/api/products?${params.toString()}`);
}

/**
 * گرید ریسپانسیو محصولات با لود تنبل: اول یک صفحه (۲۰ تا) لود می‌شه و با رسیدن اسکرول به انتهای لیست،
 * صفحه‌ی بعد خودکار درخواست می‌شه.
 * برای عوض‌شدن دسته/جستجو، والد باید یک `key` جدید بده تا گرید از صفر ساخته بشه
 * (به این ترتیب پاسخ‌های کهنه‌ی درخواست قبلی هیچ‌وقت وارد لیست جدید نمی‌شن).
 */
export default function ProductsGrid({ categoryId = null, q = null, discounted = false, initialProducts = null }) {
  // initialProducts: صفحه‌ی اولی که سرور توی HTML گذاشته (برای سئو)؛ بعدش اسکرول بی‌نهایت از cursor ادامه می‌ده
  const seeded = initialProducts && initialProducts.length > 0;
  const [products, setProducts] = useState(seeded ? initialProducts : []);
  const [hasMore, setHasMore] = useState(seeded ? initialProducts.length >= PRODUCTS_PAGE_SIZE : true);
  const [loading, setLoading] = useState(!seeded);
  const [error, setError] = useState("");
  useToastOnChange(error);
  const sentinelRef = useRef(null);
  const cursorRef = useRef(seeded ? initialProducts[initialProducts.length - 1].id : null);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError("");
    try {
      const data = await fetchProducts({ cursor: cursorRef.current, categoryId, q, discounted });
      setProducts((prev) => [...prev, ...data.products]);
      cursorRef.current = data.nextCursor;
      setHasMore(Boolean(data.nextCursor));
    } catch (err) {
      setError(err.message || "دریافت محصولات با خطا مواجه شد");
      setHasMore(false); // تا با دیدن sentinel حلقه‌ی درخواست خطادار نسازیم؛ دکمه‌ی «تلاش دوباره» هست
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [categoryId, q, discounted]);

  // اولین صفحه
  useEffect(() => {
    if (seeded) return; // صفحه‌ی اول از سرور اومده
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMore]);

  // رسیدن اسکرول به انتهای لیست → صفحه‌ی بعد
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

  function retry() {
    setHasMore(true);
    loadMore();
  }

  const empty = !loading && products.length === 0 && !error;

  return (
    <div>
      <div className={GRID}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {empty && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <FaSearch size={24} />
          </span>
          <p className="text-sm font-bold text-slate-700">
            {q ? `محصولی برای «${q}» پیدا نشد` : "محصولی در این دسته وجود ندارد"}
          </p>
          <p className="text-xs leading-6 text-slate-500">املای عبارت را بررسی کنید، کلمه‌های کمتری بنویسید (مثلاً «شیر» به‌جای «شیر کم‌چرب پگاه») یا دسته‌ی دیگری را امتحان کنید.</p>
          {q && (
            <Link
              href="/products"
              className={cn(buttonVariants({ size: "default" }), "mt-1")}
            >
              نمایش همه محصولات
            </Link>
          )}
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="rounded-full bg-white px-4 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            تلاش دوباره
          </button>
        </div>
      )}

      {loading && (
        <div className={`${GRID} py-4`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* سنسور انتهای لیست: وقتی دیده بشه یعنی اسکرول به آخر رسیده */}
      {hasMore && <div ref={sentinelRef} className="h-1 w-full" />}
    </div>
  );
}
