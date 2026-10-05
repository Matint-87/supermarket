"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import CategoryTabs from "@/components/CategoryTabs";
import ProductsGrid from "@/components/ProductsGrid";
import { api } from "@/lib/api-client";

export default function ProductsPageClient() {
  const params = useSearchParams();
  const q = params.get("q")?.trim() || null;
  const discounted = params.get("discounted") === "1";
  const [categories, setCategories] = useState([]);
  // اگه از قفسه‌های صفحه‌ی اصلی اومده باشیم، دسته از آدرس (?category=) خونده می‌شه
  const [activeCategoryId, setActiveCategoryId] = useState(params.get("category") || null);

  useEffect(() => {
    api("GET", "/api/categories")
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <h1 className="text-lg font-extrabold text-slate-800">
        {q ? <>نتایج جستجو برای «{q}»</> : discounted ? "کالاهای شگفت‌انگیز" : "همه محصولات"}
      </h1>
      <CategoryTabs categories={categories} activeId={activeCategoryId} onChange={setActiveCategoryId} />
      {/* key: با عوض‌شدن دسته یا عبارت جستجو، گرید از صفر ساخته می‌شه */}
      <ProductsGrid
        key={`${activeCategoryId ?? "all"}|${q ?? ""}|${discounted}`}
        categoryId={activeCategoryId}
        q={q}
        discounted={discounted}
      />
    </main>
  );
}
