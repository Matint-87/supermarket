import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import ProductCard from "@/components/ProductCard";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { getProductById, getRelatedProducts } from "@/lib/catalog";
import { formatNumber, formatToman } from "@/lib/format";
import { formatUnitAmount } from "@/lib/product-constants";
import { JsonLd, breadcrumbLd, buildMetadata, truncate } from "@/lib/seo";
import { SITE_NAME, absUrl, categoryPath, productPath } from "@/lib/site";
import { RETURN_WINDOW_DAYS } from "@/lib/store-info";

// قیمت‌ها در دیتابیس تومانه؛ کد ارز استاندارد ISO برای ایران IRR (ریال) است، پس ×۱۰
const toRial = (toman) => toman * 10;

function describe(p) {
  if (p.description?.trim()) return truncate(p.description, 160);
  const unit = formatUnitAmount(p.amount, p.unit);
  const base = `خرید آنلاین ${p.name} (${unit}) با قیمت ${formatToman(p.finalPrice)}`;
  return truncate(`${base}${p.discountPercent > 0 ? ` و ${formatNumber(p.discountPercent)} درصد تخفیف` : ""}؛ ارسال سریع از ${SITE_NAME}`, 160);
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await getProductById(id);
  if (!p) return { title: "محصول پیدا نشد", robots: { index: false, follow: false } };
  const unit = formatUnitAmount(p.amount, p.unit);
  return buildMetadata({
    title: `خرید ${p.name} ${unit}`,
    description: describe(p),
    path: productPath(p.id),
    image: p.imageUrl,
  });
}

function productLd(p) {
  const url = absUrl(productPath(p.id));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: p.name,
    description: p.description?.trim() || describe(p),
    sku: p.id,
    url,
    category: p.category.name,
    ...(p.imageUrl && { image: [absUrl(p.imageUrl)] }),
    ...(p.brand && { brand: { "@type": "Brand", name: p.brand.name } }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "IRR",
      price: toRial(p.finalPrice),
      itemCondition: "https://schema.org/NewCondition",
      availability: p.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE_NAME },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "IR",
        returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: RETURN_WINDOW_DAYS,
        returnMethod: "https://schema.org/ReturnInStore",
      },
    },
  };
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const p = await getProductById(id);
  if (!p) notFound();

  const related = await getRelatedProducts(p).catch(() => []);
  const hasDiscount = p.discountPercent > 0;
  const soldOut = p.stock <= 0;

  const crumbs = [
    { name: "خانه", path: "/" },
    { name: p.category.name, path: categoryPath(p.category.id) },
    { name: p.name, path: productPath(p.id) },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number] text-slate-800">
      <Header />
      <JsonLd data={productLd(p)} />
      <JsonLd data={breadcrumbLd(crumbs)} />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6">
        <nav aria-label="مسیر صفحه" className="text-xs text-slate-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => (
              <li key={c.path} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">/</span>}
                {i < crumbs.length - 1 ? (
                  <Link href={c.path} className="hover:text-green-700">
                    {c.name}
                  </Link>
                ) : (
                  <span aria-current="page" className="line-clamp-1 text-slate-700">
                    {c.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <article className="grid grid-cols-1 gap-6 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200/70 md:grid-cols-2 md:p-8">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-50">
            {p.imageUrl ? (
              // اولین تصویر صفحه (LCP): بدون lazy، با اولویت بالا
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.imageUrl}
                alt={`${p.name} ${formatUnitAmount(p.amount, p.unit)}`}
                width={800}
                height={800}
                fetchPriority="high"
                decoding="async"
                className={`h-full w-full object-contain ${soldOut ? "opacity-50 grayscale" : ""}`}
              />
            ) : null}
            {hasDiscount && !soldOut && (
              <span className="absolute start-3 top-3 rounded-full bg-linear-to-b from-orange-400 to-orange-600 px-3 py-1 text-sm font-bold text-white">
                ٪{formatNumber(p.discountPercent)} تخفیف
              </span>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-extrabold leading-9 text-slate-800 md:text-2xl">{p.name}</h1>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">دسته‌بندی</dt>
              <dd>
                <Link href={categoryPath(p.category.id)} className="font-medium text-green-700 hover:underline">
                  {p.category.name}
                </Link>
              </dd>
              {p.brand && (
                <>
                  <dt className="text-slate-500">برند</dt>
                  <dd className="font-medium">{p.brand.name}</dd>
                </>
              )}
              <dt className="text-slate-500">واحد فروش</dt>
              <dd className="font-medium">{formatUnitAmount(p.amount, p.unit)}</dd>
              <dt className="text-slate-500">وضعیت</dt>
              <dd className={`font-medium ${soldOut ? "text-rose-600" : "text-green-700"}`}>{soldOut ? "ناموجود" : "موجود در انبار"}</dd>
            </dl>

            <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
              <div>
                {hasDiscount && <del className="block text-sm text-slate-400">{formatToman(p.price)}</del>}
                <span className={`text-2xl font-extrabold ${soldOut ? "text-slate-400" : "text-slate-800"}`}>{formatToman(p.finalPrice)}</span>
              </div>
              <AddToCartButton product={p} />
            </div>
          </div>
        </article>

        {p.description?.trim() && (
          <section className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-slate-200/70 md:p-8">
            <h2 className="mb-3 text-base font-extrabold">درباره‌ی {p.name}</h2>
            <p className="whitespace-pre-line text-sm leading-8 text-slate-600">{p.description}</p>
          </section>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related">
            <h2 id="related" className="mb-4 text-base font-extrabold">
              محصولات مشابه در «{p.category.name}»
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {related.map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
