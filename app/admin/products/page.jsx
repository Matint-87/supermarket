import ProductsAdmin from "@/components/admin/ProductsAdmin";
import { fetchProductsPage, parseProductFilters } from "@/lib/admin-queries";
import { toPublicBrand, toPublicCategory } from "@/lib/dal";
import { prisma } from "@/lib/db";

export const metadata = { title: "مدیریت محصولات | پنل مدیریت" };

export default async function AdminProductsPage({ searchParams }) {
  const filters = parseProductFilters(await searchParams);

  // دسته‌ها برای فیلتر و فرم محصول همیشه کامل لازمن؛ فقط خود لیست محصولات ۱۰تا۱۰تا لود می‌شه
  const [categories, brands, initial] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.brand.findMany({ orderBy: { name: "asc" } }),
    fetchProductsPage(filters),
  ]);

  return (
    <ProductsAdmin
      key={JSON.stringify(filters)}
      filters={filters}
      initial={initial}
      categories={categories.map(toPublicCategory)}
      brands={brands.map(toPublicBrand)}
    />
  );
}
