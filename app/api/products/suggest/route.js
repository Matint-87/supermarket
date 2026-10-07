import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { productSearchWhere, relevanceScore } from "@/lib/product-search";

const SUGGEST_LIMIT = 8;

/**
 * پیشنهادهای جست‌وجوی هدر (autocomplete): محصول‌های فعالی که با عبارت جور باشن (نام / دسته / برند)،
 * به ترتیب مرتبط‌بودن (نه فقط جدیدترین) و حداکثر ۸ تا
 */
export const GET = handler(async (request) => {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return ok({ products: [] });

  // یه مجموعه‌ی بزرگ‌تر می‌گیریم، توی JS بر اساس مرتبط‌بودن مرتب می‌کنیم و بعد می‌بریم
  const rows = await prisma.product.findMany({
    where: { isActive: true, ...productSearchWhere(q) },
    orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
    take: 40,
    select: {
      id: true,
      name: true,
      imageUrl: true,
      stock: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
    },
  });

  const products = rows
    .map((p) => ({ p, score: relevanceScore({ name: p.name, brand: p.brand?.name, stock: p.stock }, q) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SUGGEST_LIMIT)
    .map(({ p }) => ({
      id: p.id,
      name: p.name,
      imageUrl: p.imageUrl,
      category: p.category?.name ?? "",
      brand: p.brand?.name ?? "",
    }));

  return ok({ products });
});
