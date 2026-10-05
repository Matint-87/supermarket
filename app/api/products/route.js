import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin, toPublicProduct } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { productSearchWhere } from "@/lib/product-search";
import { PRODUCTS_PAGE_SIZE } from "@/lib/product-constants";
import { productSchema, uuidSchema } from "@/lib/schemas";

/**
 * عمومی: فهرست محصولات با pagination مبتنی بر cursor (برای lazy loading / اسکرول بی‌نهایت).
 * پارامترها: cursor (id آخرین محصول صفحه‌ی قبل)، limit (پیش‌فرض ۲۰، حداکثر ۴۰)، categoryId، q (جست‌وجو در نام و دسته‌بندی؛ چندکلمه‌ای، بی‌توجه به ترتیب/نیم‌فاصله/ی-ک عربی/ارقام)،
 * discounted=1 (فقط تخفیف‌دارها)، sort=discount (بیشترین تخفیف اول؛ پیش‌فرض جدیدترین اول)
 */
export const GET = handler(async (request) => {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const categoryId = searchParams.get("categoryId");
  const q = searchParams.get("q")?.trim().slice(0, 80);
  const discountedOnly = searchParams.get("discounted") === "1";
  const sortByDiscount = searchParams.get("sort") === "discount";

  let limit = Number(searchParams.get("limit")) || PRODUCTS_PAGE_SIZE;
  limit = Math.min(Math.max(limit, 1), 40);

  if (cursor && !uuidSchema.safeParse(cursor).success) throw new ApiError(400, "cursor نامعتبر است");
  if (categoryId && !uuidSchema.safeParse(categoryId).success) {
    throw new ApiError(400, "دسته‌بندی نامعتبر است");
  }

  const where = {
    isActive: true,
    ...(categoryId && { categoryId }),
    ...(discountedOnly && { discountPercent: { gt: 0 } }),
    ...productSearchWhere(q),
  };

  const rows = await prisma.product.findMany({
    where,
    orderBy: sortByDiscount
      ? [{ discountPercent: "desc" }, { id: "desc" }]
      : [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    include: { category: true, brand: true },
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return ok({ products: items.map(toPublicProduct), nextCursor });
});

// فقط ادمین: ساخت محصول جدید (عکس رو قبلش با /api/products/upload آپلود کن و imageUrl رو بفرست)
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = productSchema.parse(await readJson(request));

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) throw new ApiError(400, "دسته‌بندی انتخاب‌شده معتبر نیست");

  if (data.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: data.brandId } });
    if (!brand) throw new ApiError(400, "برند انتخاب‌شده معتبر نیست");
  }

  const created = await prisma.product.create({ data, include: { category: true, brand: true } });
  await logActivity(admin, { action: "CREATE", entity: "PRODUCT", entityId: created.id, summary: `محصول «${created.name}» اضافه شد` });
  return ok({ product: toPublicProduct(created) }, { status: 201 });
});
