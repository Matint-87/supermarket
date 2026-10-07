import { prisma } from "@/lib/db";
import { absUrl, categoryPath, productPath } from "@/lib/site";

// هر ساعت دوباره ساخته می‌شه تا محصول/دسته‌ی جدید خودکار وارد نقشه‌ی سایت بشه
export const revalidate = 3600;

const STATIC_PAGES = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/products", changeFrequency: "daily", priority: 0.9 },
  { path: "/shipping-info", changeFrequency: "monthly", priority: 0.4 },
  { path: "/returns", changeFrequency: "monthly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.4 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap() {
  const entries = STATIC_PAGES.map(({ path, ...rest }) => ({ url: absUrl(path), ...rest }));

  try {
    const [categories, products] = await Promise.all([
      prisma.category.findMany({ where: { isActive: true }, select: { id: true, updatedAt: true } }),
      prisma.product.findMany({
        where: { isActive: true, category: { isActive: true } },
        select: { id: true, imageUrl: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 50000, // سقف استاندارد یک sitemap؛ بیشتر از این باید generateSitemaps استفاده بشه
      }),
    ]);

    for (const c of categories) {
      entries.push({ url: absUrl(categoryPath(c.id)), lastModified: c.updatedAt, changeFrequency: "daily", priority: 0.8 });
    }
    for (const p of products) {
      entries.push({
        url: absUrl(productPath(p.id)),
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
        ...(p.imageUrl && { images: [absUrl(p.imageUrl)] }),
      });
    }
  } catch (err) {
    // دیتابیس در دسترس نبود: حداقل صفحه‌های ثابت رو بده
    console.error("[sitemap]", err);
  }

  return entries;
}
