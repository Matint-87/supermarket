import { ApiError, handler, ok, pickProvided, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireApiAdmin, toPublicCourier } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { courierSchema, uuidSchema } from "@/lib/schemas";

async function readId(ctx) {
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  return id;
}

export const PATCH = handler(async (request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);
  const raw = await readJson(request);
  const data = pickProvided(raw, courierSchema.partial().parse(raw));
  const updated = await prisma.courier
    .update({ where: { id }, data, include: { _count: { select: { orders: true } } } })
    .catch(() => {
      throw new ApiError(404, "پیک پیدا نشد");
    });
  await logActivity(admin, { action: "UPDATE", entity: "COURIER", entityId: id, summary: `پیک «${updated.name}» ویرایش شد` });
  return ok({ courier: { ...toPublicCourier(updated), orderCount: updated._count.orders } });
});

export const DELETE = handler(async (_request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);
  const existing = await prisma.courier.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
  if (!existing) throw new ApiError(404, "پیک پیدا نشد");
  // سابقه‌ی تحویل‌ها حفظ بشه: پیکِ دارای سفارش رو غیرفعال کن نه حذف
  if (existing._count.orders > 0) {
    throw new ApiError(409, `این پیک ${existing._count.orders} سفارش دارد و قابل حذف نیست. به‌جای حذف، او را غیرفعال کنید.`);
  }
  await prisma.courier.delete({ where: { id } });
  await logActivity(admin, { action: "DELETE", entity: "COURIER", entityId: id, summary: `پیک «${existing.name}» حذف شد` });
  return ok({});
});
