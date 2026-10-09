import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { uuidSchema } from "@/lib/schemas";

async function parseId(ctx) {
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(404, "پیام پیدا نشد");
  return id;
}

/** فقط ادمین: وضعیت تحویل هر گیرنده (یک تیک = ارسال شده، دو تیک = خوانده شده) */
export const GET = handler(async (_request, ctx) => {
  await requireApiAdmin();
  const id = await parseId(ctx);
  const broadcast = await prisma.notificationBroadcast.findUnique({ where: { id }, select: { id: true } });
  if (!broadcast) throw new ApiError(404, "پیام پیدا نشد");

  const rows = await prisma.notification.findMany({
    where: { broadcastId: id },
    orderBy: [{ readAt: { sort: "desc", nulls: "last" } }, { createdAt: "asc" }],
    take: 300, // برای ارسال به «همه» لیست خیلی بلند نشه؛ شمارنده‌ی کل جدا حساب می‌شه
    select: { id: true, readAt: true, user: { select: { id: true, phone: true, firstName: true, lastName: true } } },
  });
  return ok({
    recipients: rows.map((r) => ({
      id: r.id,
      userId: r.user.id,
      phone: r.user.phone,
      name: [r.user.firstName, r.user.lastName].filter(Boolean).join(" "),
      readAt: r.readAt ? r.readAt.toISOString() : null,
    })),
  });
});

/** فقط ادمین: حذف یک پیام از سیستم و از لیست همه‌ی گیرنده‌ها */
export const DELETE = handler(async (_request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await parseId(ctx);
  const existing = await prisma.notificationBroadcast.findUnique({ where: { id }, select: { title: true } });
  if (!existing) throw new ApiError(404, "پیام پیدا نشد");
  await prisma.notificationBroadcast.delete({ where: { id } });
  await logActivity(admin, { action: "DELETE", entity: "NOTIFICATION", entityId: id, summary: `پیام «${existing.title}» حذف شد` });
  return ok({});
});
