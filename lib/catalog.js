// خواندن محصول/دسته برای صفحه‌های سمت‌سرور (سئو). فقط محصول و دسته‌ی «فعال» برمی‌گرده.
import "server-only";
import { cache } from "react";
import { toPublicCategory, toPublicProduct } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { uuidSchema } from "@/lib/schemas";

export const CATEGORY_PAGE_SIZE = 24;

const isUuid = (v) => uuidSchema.safeParse(v).success;
const NEWEST = [{ createdAt: "desc" }, { id: "desc" }];

// cache: generateMetadata و خود صفحه یک کوئری مشترک می‌زنن
export const getProductById = cache(async (id) => {
  if (!isUuid(id)) return null;
  const row = await prisma.product.findFirst({
    where: { id, isActive: true, category: { isActive: true } },
    include: { category: true, brand: true },
  });
  return row ? { ...toPublicProduct(row), updatedAt: row.updatedAt.toISOString() } : null;
});

export async function getRelatedProducts(product, take = 8) {
  const rows = await prisma.product.findMany({
    where: { isActive: true, categoryId: product.category.id, id: { not: product.id }, stock: { gt: 0 } },
    orderBy: NEWEST,
    take,
    include: { category: true, brand: true },
  });
  return rows.map(toPublicProduct);
}

export const getCategoryById = cache(async (id) => {
  if (!isUuid(id)) return null;
  const row = await prisma.category.findFirst({ where: { id, isActive: true } });
  return row ? toPublicCategory(row) : null;
});

export async function getCategoryProductsPage(categoryId, page) {
  const where = { isActive: true, categoryId };
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: NEWEST,
      skip: (page - 1) * CATEGORY_PAGE_SIZE,
      take: CATEGORY_PAGE_SIZE,
      include: { category: true, brand: true },
    }),
  ]);
  return { total, totalPages: Math.max(1, Math.ceil(total / CATEGORY_PAGE_SIZE)), products: rows.map(toPublicProduct) };
}

export async function getActiveCategories() {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toPublicCategory);
}

/** محصولات صفحه‌ی اول برای رندر سمت‌سرور (خطای دیتابیس → لیست خالی، تا صفحه خراب نشه) */
export async function getProductsForShelf({ limit = 12, discounted = false } = {}) {
  try {
    const rows = await prisma.product.findMany({
      where: { isActive: true, ...(discounted && { discountPercent: { gt: 0 } }) },
      orderBy: discounted ? [{ discountPercent: "desc" }, { id: "desc" }] : NEWEST,
      take: limit,
      include: { category: true, brand: true },
    });
    return rows.map(toPublicProduct);
  } catch (err) {
    console.error("[catalog]", err);
    return null; // null = از سمت کلاینت خودش لود می‌کنه
  }
}
