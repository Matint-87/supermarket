import { Suspense } from "react";
import { permanentRedirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import ProductsPageClient from "@/components/ProductsPageClient";
import { getProductsForShelf } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { uuidSchema } from "@/lib/schemas";

const one = (v) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }) {
  const sp = await searchParams;
  if (one(sp.q)?.trim()) {
    // نتایج جستجوی داخلی: بی‌نهایت URL بی‌ارزش؛ ایندکس نشه ولی لینک‌هاش دنبال بشن
    return { title: "نتایج جستجو", robots: { index: false, follow: true } };
  }
  if (one(sp.discounted) === "1") {
    return buildMetadata({
      title: "کالاهای شگفت‌انگیز | تخفیف ویژه",
      description: "جدیدترین کالاهای تخفیف‌دار و پیشنهادهای شگفت‌انگیز با بیشترین درصد تخفیف.",
      path: "/products?discounted=1",
    });
  }
  return buildMetadata({
    title: "همه محصولات",
    description: "فهرست کامل محصولات فروشگاه: لبنیات، مواد غذایی، پروتئین، بهداشتی و شوینده با قیمت روز و ارسال سریع.",
    path: "/products",
  });
}

export default async function ProductsPage({ searchParams }) {
  const sp = await searchParams;
  const category = one(sp.category);
  // /products?category=ID آدرس تکراری صفحه‌ی دسته است؛ دائمی به آدرس اصلی می‌ره (سیگنال‌های سئو یکی می‌شن)
  if (category && uuidSchema.safeParse(category).success && !one(sp.q) && one(sp.discounted) !== "1") {
    permanentRedirect(`/categories/${category}`);
  }
  // اولین صفحه‌ی محصولات توی HTML اولیه (فقط حالت پیش‌فرض بدون فیلتر)
  const isDefault = !one(sp.q) && !category && one(sp.discounted) !== "1";
  const initialProducts = isDefault ? await getProductsForShelf({ limit: 20 }) : null;
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number] text-slate-800">
      <Header />
      {/* ProductsPageClient از useSearchParams (پارامتر q) استفاده می‌کنه، پس Suspense لازمه */}
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6" />}>
        <ProductsPageClient initialProducts={initialProducts} />
      </Suspense>
      <Footer />
      <BottomNav />
    </div>
  );
}
