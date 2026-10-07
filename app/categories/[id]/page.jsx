import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import ProductCard from "@/components/ProductCard";
import { getCategoryById, getCategoryProductsPage } from "@/lib/catalog";
import { formatNumber } from "@/lib/format";
import { JsonLd, breadcrumbLd, buildMetadata } from "@/lib/seo";
import { SITE_NAME, absUrl, categoryPath, productPath } from "@/lib/site";

const parsePage = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : 1;
};

export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const page = parsePage((await searchParams).page);
  const c = await getCategoryById(id);
  if (!c) return { title: "دسته پیدا نشد", robots: { index: false, follow: false } };
  return buildMetadata({
    title: `خرید آنلاین ${c.name}${page > 1 ? ` - صفحه ${formatNumber(page)}` : ""}`,
    description: `قیمت و خرید آنلاین انواع ${c.name} با بهترین قیمت، تضمین اصالت کالا و ارسال سریع از ${SITE_NAME}.`,
    path: categoryPath(c.id, page),
    image: c.imageUrl,
  });
}

export default async function CategoryPage({ params, searchParams }) {
  const { id } = await params;
  const page = parsePage((await searchParams).page);
  const category = await getCategoryById(id);
  if (!category) notFound();

  const { total, totalPages, products } = await getCategoryProductsPage(category.id, page);
  if (page > totalPages) notFound();

  const crumbs = [
    { name: "خانه", path: "/" },
    { name: "همه محصولات", path: "/products" },
    { name: category.name, path: categoryPath(category.id) },
  ];

  const listLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: category.name,
    url: absUrl(categoryPath(category.id, page)),
    inLanguage: "fa-IR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: total,
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: (page - 1) * products.length + i + 1,
        url: absUrl(productPath(p.id)),
        name: p.name,
      })),
    },
  };

  const pageLink = (n, label, rel) => (
    <Link
      key={label}
      href={categoryPath(category.id, n)}
      rel={rel}
      aria-current={n === page ? "page" : undefined}
      className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-medium ring-1 ${
        n === page ? "bg-green-700 text-white ring-green-700" : "bg-white text-slate-600 ring-slate-200 hover:bg-green-50"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number] text-slate-800">
      <Header />
      <JsonLd data={breadcrumbLd(crumbs)} />
      <JsonLd data={listLd} />

      <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
        <nav aria-label="مسیر صفحه" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => (
              <li key={c.path} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">/</span>}
                {i < crumbs.length - 1 ? <Link href={c.path} className="hover:text-green-700">{c.name}</Link> : <span aria-current="page" className="text-slate-700">{c.name}</span>}
              </li>
            ))}
          </ol>
        </nav>

        <h1 className="text-lg font-extrabold">خرید آنلاین {category.name}</h1>
        <p className="text-xs text-slate-500">{formatNumber(total)} محصول</p>

        {products.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500">فعلاً محصولی در این دسته وجود ندارد.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="صفحه‌بندی" className="flex flex-wrap justify-center gap-2 pt-4">
            {page > 1 && pageLink(page - 1, "قبلی", "prev")}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
              .map((n) => pageLink(n, formatNumber(n)))}
            {page < totalPages && pageLink(page + 1, "بعدی", "next")}
          </nav>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
