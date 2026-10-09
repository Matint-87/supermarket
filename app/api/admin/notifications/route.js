import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { sendBroadcast } from "@/lib/notify";
import { bulkDeleteSchema, broadcastSchema, uuidSchema } from "@/lib/schemas";

const PAGE = 20;

const toPublic = (b, readCount) => ({
  id: b.id,
  title: b.title,
  body: b.body,
  url: b.url,
  audience: b.audience,
  adminName: b.adminName,
  recipientCount: b.recipientCount,
  readCount,
  createdAt: b.createdAt.toISOString(),
});

/** تعداد «خوانده‌شده» برای هر پیام (با یک groupBy، نه یک کوئری برای هر ردیف) */
async function readCounts(ids) {
  if (ids.length === 0) return new Map();
  const rows = await prisma.notification.groupBy({
    by: ["broadcastId"],
    where: { broadcastId: { in: ids }, readAt: { not: null } },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.broadcastId, r._count._all]));
}

/** فقط ادمین: پیام‌های ارسال‌شده (جدیدترین اول) با cursor + تعداد خوانده‌شده‌ها */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const cursor = new URL(request.url).searchParams.get("cursor");
  if (cursor && !uuidSchema.safeParse(cursor).success) throw new ApiError(400, "cursor نامعتبر است");

  const [rows, total] = await Promise.all([
    prisma.notificationBroadcast.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    prisma.notificationBroadcast.count(),
  ]);
  const hasMore = rows.length > PAGE;
  const page = hasMore ? rows.slice(0, PAGE) : rows;
  const counts = await readCounts(page.map((b) => b.id));
  return ok({
    broadcasts: page.map((b) => toPublic(b, counts.get(b.id) ?? 0)),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total,
  });
});

/** فقط ادمین: ارسال پیام (یک نفر، چند نفر یا همه‌ی مشتری‌ها) */
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = broadcastSchema.parse(await readJson(request));

  const { broadcast, recipientCount } = await sendBroadcast(admin, data);
  if (!broadcast) throw new ApiError(409, "گیرنده‌ی فعالی برای این پیام پیدا نشد");

  await logActivity(admin, {
    action: "CREATE",
    entity: "NOTIFICATION",
    entityId: broadcast.id,
    summary: `پیام «${broadcast.title}» برای ${recipientCount.toLocaleString("fa-IR")} کاربر ارسال شد`,
  });
  return ok({ broadcast: toPublic(broadcast, 0), recipientCount }, { status: 201 });
});

/** فقط ادمین: حذف پیام‌ها از سیستم و از لیست همه‌ی گیرنده‌ها — { ids: [...] } یا { all: true } */
export const DELETE = handler(async (request) => {
  const admin = await requireApiAdmin();
  const { all, ids } = bulkDeleteSchema.parse(await readJson(request));
  if (!all && !ids?.length) throw new ApiError(400, "چیزی برای حذف انتخاب نشده");

  const { count } = await prisma.notificationBroadcast.deleteMany({ where: all ? {} : { id: { in: ids } } });
  await logActivity(admin, {
    action: "DELETE",
    entity: "NOTIFICATION",
    summary: all ? `همه‌ی پیام‌های ارسالی حذف شد (${count.toLocaleString("fa-IR")} مورد)` : `${count.toLocaleString("fa-IR")} پیام ارسالی حذف شد`,
  });
  return ok({ deleted: count });
});
