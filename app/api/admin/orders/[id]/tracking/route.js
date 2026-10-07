import { ApiError, handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { announceTrackingCode } from "@/lib/notify";
import { trackingCodeSchema } from "@/lib/schemas";

/** ثبت (یا پاک‌کردن) کد رهگیری پستی سفارش؛ [id] همون کد ۸ رقمی سفارشه */
export const PATCH = handler(async (request, { params }) => {
  const admin = await requireApiAdmin();
  const { id: code } = await params;
  if (!/^\d{8}$/.test(code)) throw new ApiError(400, "کد سفارش نامعتبر است");
  const { trackingCode } = trackingCodeSchema.parse(await readJson(request));

  const order = await prisma.order.findUnique({ where: { code }, select: { id: true, userId: true, code: true, trackingCode: true } });
  if (!order) throw new ApiError(404, "سفارش پیدا نشد");

  await prisma.order.update({ where: { id: order.id }, data: { trackingCode } });
  if (trackingCode && trackingCode !== order.trackingCode) await announceTrackingCode({ ...order, trackingCode });
  await logActivity(admin, {
    action: "UPDATE",
    entity: "ORDER",
    entityId: order.id,
    summary: trackingCode ? `کد رهگیری سفارش ${code} ثبت شد (${trackingCode})` : `کد رهگیری سفارش ${code} پاک شد`,
  });
  return ok({ trackingCode });
});
