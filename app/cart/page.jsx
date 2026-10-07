import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartPageClient from "@/components/cart/CartPageClient";

export const metadata = { title: "سبد خرید", robots: { index: false, follow: false } };

export default function CartPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number] text-slate-800">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <CartPageClient />
      </main>
      <Footer />
    </div>
  );
}
