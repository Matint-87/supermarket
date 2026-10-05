import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin, toPublicBrand } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { brandSchema } from "@/lib/schemas";

// عمومی: فهرست برندهای فعال
export const GET = handler(async () => {
  const brands = await prisma.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return ok({ brands: brands.map(toPublicBrand) });
});

// فقط ادمین: ساخت برند جدید
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = brandSchema.parse(await readJson(request));
  const dup = await prisma.brand.findUnique({ where: { name: data.name } });
  if (dup) throw new ApiError(409, "برندی با این نام وجود دارد", { fields: { name: "این نام قبلاً ثبت شده است" } });
  const created = await prisma.brand.create({ data });
  await logActivity(admin, { action: "CREATE", entity: "BRAND", entityId: created.id, summary: `برند «${created.name}» ساخته شد` });
  return ok({ brand: toPublicBrand(created) }, { status: 201 });
});
