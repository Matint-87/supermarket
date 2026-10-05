import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import ProductsPageClient from "@/components/ProductsPageClient";

export const metadata = { title: "همه محصولات | سوپرمارکت رحیمی" };

export default function ProductsPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number] text-slate-800">
      <Header />
      {/* ProductsPageClient از useSearchParams (پارامتر q) استفاده می‌کنه، پس Suspense لازمه */}
      <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6" />}>
        <ProductsPageClient />
      </Suspense>
      <Footer />
      <BottomNav />
    </div>
  );
}
