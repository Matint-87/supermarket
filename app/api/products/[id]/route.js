import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, pickProvided, readJson } from "@/lib/api";
import { requireApiAdmin, toPublicProduct } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { productUpdateSchema, uuidSchema } from "@/lib/schemas";
import { deleteImage } from "@/lib/storage";

// پاک‌کردن عکس قدیمی (Blob یا فایل محلی) — جزئیات توی lib/storage.js
const deleteOldImage = (url) => deleteImage(url, "products");

export const GET = handler(async (_request, { params }) => {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true, brand: true } });
  if (!product) throw new ApiError(404, "محصول پیدا نشد");
  return ok({ product: toPublicProduct(product) });
});

export const PATCH = handler(async (request, { params }) => {
  const admin = await requireApiAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  const raw = await readJson(request);
  // فقط فیلدهای فرستاده‌شده اعمال بشن (وگرنه default های zod موجودی/تخفیف/فعال‌بودن رو بازنشانی می‌کنن)
  const data = pickProvided(raw, productUpdateSchema.parse(raw));

  if (data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) throw new ApiError(400, "دسته‌بندی انتخاب‌شده معتبر نیست");
  }

  if (data.brandId) {
    const brand = await prisma.brand.findUnique({ where: { id: data.brandId } });
    if (!brand) throw new ApiError(400, "برند انتخاب‌شده معتبر نیست");
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "محصول پیدا نشد");

  const updated = await prisma.product.update({ where: { id }, data, include: { category: true, brand: true } });

  if (data.imageUrl !== undefined && data.imageUrl !== existing.imageUrl) {
    await deleteOldImage(existing.imageUrl);
  }

  await logActivity(admin, { action: "UPDATE", entity: "PRODUCT", entityId: id, summary: `محصول «${updated.name}» ویرایش شد` });
  return ok({ product: toPublicProduct(updated) });
});

export const DELETE = handler(async (_request, { params }) => {
  const admin = await requireApiAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "محصول پیدا نشد");

  await prisma.product.delete({ where: { id } });
  await deleteOldImage(existing.imageUrl);
  await logActivity(admin, { action: "DELETE", entity: "PRODUCT", entityId: id, summary: `محصول «${existing.name}» حذف شد` });

  return ok({});
});

