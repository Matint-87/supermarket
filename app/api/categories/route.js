import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin, toPublicCategory } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/schemas";

// عمومی: فهرست دسته‌های فعال برای تب‌های صفحه‌ی محصولات
export const GET = handler(async () => {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return ok({ categories: categories.map(toPublicCategory) });
});

// فقط ادمین: ساخت دسته‌ی جدید
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = categorySchema.parse(await readJson(request));
  const dup = await prisma.category.findUnique({ where: { name: data.name } });
  if (dup) throw new ApiError(409, "دسته‌ای با این نام وجود دارد", { fields: { name: "این نام قبلاً ثبت شده است" } });
  const created = await prisma.category.create({ data });
  await logActivity(admin, { action: "CREATE", entity: "CATEGORY", entityId: created.id, summary: `دسته‌ی «${created.name}» ساخته شد` });
  return ok({ category: toPublicCategory(created) }, { status: 201 });
});
