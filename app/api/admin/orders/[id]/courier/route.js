import { ApiError, handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { courierAssignSchema } from "@/lib/schemas";

/** تعیین (یا برداشتن) پیکِ یک سفارش؛ [id] همون کد ۸ رقمی سفارشه */
export const PATCH = handler(async (request, { params }) => {
  const admin = await requireApiAdmin();
  const { id: code } = await params;
  if (!/^\d{8}$/.test(code)) throw new ApiError(400, "کد سفارش نامعتبر است");
  const { courierId } = courierAssignSchema.parse(await readJson(request));

  const order = await prisma.order.findUnique({ where: { code } });
  if (!order) throw new ApiError(404, "سفارش پیدا نشد");

  let courier = null;
  if (courierId) {
    courier = await prisma.courier.findUnique({ where: { id: courierId } });
    if (!courier || (!courier.isActive && courier.id !== order.courierId)) {
      throw new ApiError(400, "پیک انتخاب‌شده معتبر یا فعال نیست");
    }
  }

  await prisma.order.update({ where: { id: order.id }, data: { courierId } });
  await logActivity(admin, {
    action: "UPDATE",
    entity: "ORDER",
    entityId: order.id,
    summary: courier ? `پیک «${courier.name}» برای سفارش ${code} تعیین شد` : `پیک سفارش ${code} برداشته شد`,
  });
  return ok({ courierId });
});
