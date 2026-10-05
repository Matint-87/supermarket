"use client";

import { useEffect, useState } from "react";
import Shelves from "@/components/Shelves";
import Slider from "@/components/Slider";
import AmazingOffers from "@/components/Amazingoffers";
import HowItWorks from "@/components/HowItWorks";
import CtaBand from "@/components/CtaBand";
import { api } from "@/lib/api-client";
import { useInView } from "@/lib/use-in-view";

/** محصولات واقعی از دیتابیس؛ اگه درخواست شکست بخوره بخش خالی (و مخفی) می‌شه. فقط وقتی enabled=true درخواست می‌ره */
function useProducts(query, enabled) {
  const [products, setProducts] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api("GET", `/api/products?${query}`)
      .then((d) => alive && setProducts(d.products))
      .catch(() => alive && setProducts([]));
    return () => {
      alive = false;
    };
  }, [query, enabled]);
  return products;
}

/**
 * لود تنبل یک قفسه‌ی محصولات: تا نزدیک دید نیومده، درخواستی به API نمی‌ره و اسکلتون نشون داده می‌شه.
 * (`empty:hidden`: اگه قفسه محصولی نداشت و خودش null برگردوند، فاصله‌ی اضافه هم نمی‌مونه)
 */
function LazyShelf({ query, children }) {
  const [ref, inView] = useInView("300px");
  const products = useProducts(query, inView);
  return (
    <div ref={ref} className="empty:hidden">
      {children(products)}
    </div>
  );
}

/** بخش محصولات صفحه‌ی اصلی (قفسه‌ها، شگفت‌انگیزها، جدیدترین‌ها) */
export default function HomeContent() {
  return (
    <main className="mx-auto flex max-w-7xl items-start gap-6 px-4 py-6">
      <div className="min-w-0 flex-1 space-y-8">
        {/* قفسه‌ها (دسته‌بندی‌های ادمین) بالای صفحه، بعد از بنر */}
        <Shelves />
        <LazyShelf query="limit=12&discounted=1&sort=discount">{(products) => <AmazingOffers products={products} />}</LazyShelf>
        <LazyShelf query="limit=12">{(products) => <Slider title="جدیدترین محصولات" href="/products" products={products} />}</LazyShelf>
        {/* مراحل سفارش و دعوت به خرید؛ آخر صفحه، قبل از فوتر */}
        <HowItWorks />
        <CtaBand />
      </div>
    </main>
  );
}
