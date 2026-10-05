import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, pickProvided, readJson } from "@/lib/api";
import { requireApiAdmin, toPublicBrand } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { brandSchema, uuidSchema } from "@/lib/schemas";

export const PATCH = handler(async (request, { params }) => {
  const admin = await requireApiAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  const raw = await readJson(request);
  const data = pickProvided(raw, brandSchema.partial().parse(raw));

  if (data.name) {
    const dup = await prisma.brand.findFirst({ where: { name: data.name, NOT: { id } } });
    if (dup) throw new ApiError(409, "برندی با این نام وجود دارد", { fields: { name: "این نام قبلاً ثبت شده است" } });
  }

  const updated = await prisma.brand.update({ where: { id }, data }).catch(() => {
    throw new ApiError(404, "برند پیدا نشد");
  });
  await logActivity(admin, { action: "UPDATE", entity: "BRAND", entityId: id, summary: `برند «${updated.name}» ویرایش شد` });
  return ok({ brand: toPublicBrand(updated) });
});

export const DELETE = handler(async (_request, { params }) => {
  const admin = await requireApiAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");

  // محصولات این برند با حذف، «بدون برند» می‌شن (onDelete: SetNull)
  const deleted = await prisma.brand.delete({ where: { id } }).catch(() => {
    throw new ApiError(404, "برند پیدا نشد");
  });
  await logActivity(admin, { action: "DELETE", entity: "BRAND", entityId: id, summary: `برند «${deleted.name}» حذف شد` });
  return ok({});
});
