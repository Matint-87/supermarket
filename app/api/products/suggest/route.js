import { handler, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { productSearchWhere } from "@/lib/product-search";

/** پیشنهادهای جست‌وجوی هدر (autocomplete): حداکثر ۶ محصول فعال که با عبارت جور باشن */
export const GET = handler(async (request) => {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return ok({ products: [] });

  const rows = await prisma.product.findMany({
    where: { isActive: true, ...productSearchWhere(q) },
    orderBy: [{ stock: "desc" }, { createdAt: "desc" }],
    take: 6,
    select: { id: true, name: true, imageUrl: true, category: { select: { name: true } } },
  });

  return ok({
    products: rows.map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl, category: p.category?.name ?? "" })),
  });
});
