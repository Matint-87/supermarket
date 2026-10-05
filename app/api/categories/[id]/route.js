import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, pickProvided, readJson } from "@/lib/api";
import { requireApiAdmin, toPublicCategory } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { categorySchema, uuidSchema } from "@/lib/schemas";

export const PATCH = handler(async (request, { params }) => {
  const admin = await requireApiAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  const raw = await readJson(request);
  const data = pickProvided(raw, categorySchema.partial().parse(raw));

  if (data.name) {
    const dup = await prisma.category.findFirst({ where: { name: data.name, NOT: { id } } });
    if (dup) throw new ApiError(409, "دسته‌ای با این نام وجود دارد", { fields: { name: "این نام قبلاً ثبت شده است" } });
  }

  const updated = await prisma.category
    .update({ where: { id }, data })
    .catch(() => {
      throw new ApiError(404, "دسته پیدا نشد");
    });
  await logActivity(admin, { action: "UPDATE", entity: "CATEGORY", entityId: id, summary: `دسته‌ی «${updated.name}» ویرایش شد` });
  return ok({ category: toPublicCategory(updated) });
});

export const DELETE = handler(async (_request, { params }) => {
  const admin = await requireApiAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new ApiError(400, "این دسته محصول دارد؛ ابتدا محصولات آن را حذف یا جابه‌جا کنید");
  }

  const deleted = await prisma.category.delete({ where: { id } }).catch(() => {
    throw new ApiError(404, "دسته پیدا نشد");
  });
  await logActivity(admin, { action: "DELETE", entity: "CATEGORY", entityId: id, summary: `دسته‌ی «${deleted.name}» حذف شد` });
  return ok({});
});
