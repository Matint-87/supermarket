import { ApiError, handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireApiAdmin, toPublicZone } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { shippingZoneSchema, uuidSchema } from "@/lib/schemas";

async function readId(ctx) {
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  return id;
}

/** ویرایش کامل محدوده (کلاینت همیشه همه‌ی فیلدها رو می‌فرسته) */
export const PATCH = handler(async (request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);
  const data = shippingZoneSchema.parse(await readJson(request));
  const updated = await prisma.shippingZone.update({ where: { id }, data }).catch(() => {
    throw new ApiError(404, "محدوده پیدا نشد");
  });
  await logActivity(admin, { action: "UPDATE", entity: "SHIPPING_ZONE", entityId: id, summary: `محدوده‌ی ارسال «${updated.name}» ویرایش شد` });
  return ok({ zone: toPublicZone(updated) });
});

export const DELETE = handler(async (_request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);
  const deleted = await prisma.shippingZone.delete({ where: { id } }).catch(() => {
    throw new ApiError(404, "محدوده پیدا نشد");
  });
  await logActivity(admin, { action: "DELETE", entity: "SHIPPING_ZONE", entityId: id, summary: `محدوده‌ی ارسال «${deleted.name}» حذف شد` });
  return ok({});
});
