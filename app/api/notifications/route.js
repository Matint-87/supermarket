import { z } from "zod";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { NOTIFICATIONS_PAGE_SIZE } from "@/lib/notification-constants";
import { bulkDeleteSchema, uuidSchema } from "@/lib/schemas";

const toPublic = (n) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  url: n.url,
  readAt: n.readAt ? n.readAt.toISOString() : null,
  createdAt: n.createdAt.toISOString(),
});

/**
 * اعلان‌های کاربر جاری (جدیدترین اول) با pagination مبتنی بر cursor برای لود تنبل.
 * پارامترها: cursor (id آخرین اعلان صفحه‌ی قبل)، limit (پیش‌فرض NOTIFICATIONS_PAGE_SIZE، حداکثر ۵۰).
 * unread = تعداد کل خوانده‌نشده‌ها (مستقل از صفحه‌ای که لود شده)
 */
export const GET = handler(async (request) => {
  const user = await requireApiUser();
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  if (cursor && !uuidSchema.safeParse(cursor).success) throw new ApiError(400, "cursor نامعتبر است");
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || NOTIFICATIONS_PAGE_SIZE, 1), 50);

  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id, dismissedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1, // یکی بیشتر می‌خونیم تا بفهمیم صفحه‌ی بعدی هست یا نه
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null, dismissedAt: null } }),
  ]);
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return ok({
    notifications: page.map(toPublic),
    unread,
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});

const markReadSchema = z.object({
  all: z.boolean().optional(),
  ids: z.array(uuidSchema).max(100).optional(),
});

/** علامت‌گذاری به‌عنوان خوانده: { all: true } یا { ids: [...] } */
export const PATCH = handler(async (request) => {
  const user = await requireApiUser();
  const { all, ids } = markReadSchema.parse(await readJson(request));
  if (all || ids?.length) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null, dismissedAt: null, ...(all ? {} : { id: { in: ids } }) },
      data: { readAt: new Date() },
    });
  }
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null, dismissedAt: null } });
  return ok({ unread });
});

/**
 * حذف اعلان از لیست خودِ کاربر: { ids: [...] } یا { all: true }.
 * حذف نرمه: ردیف می‌مونه ولی دیگه نشون داده نمی‌شه؛ و «خوانده‌شده» هم علامت می‌خوره
 * (کاربر پیام رو دیده، پس ادمین دو تیک رو می‌بینه).
 */
export const DELETE = handler(async (request) => {
  const user = await requireApiUser();
  const { all, ids } = bulkDeleteSchema.parse(await readJson(request));
  if (all || ids?.length) {
    const now = new Date();
    const where = { userId: user.id, dismissedAt: null, ...(all ? {} : { id: { in: ids } }) };
    await prisma.notification.updateMany({ where: { ...where, readAt: null }, data: { readAt: now } });
    await prisma.notification.updateMany({ where, data: { dismissedAt: now } });
  }
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null, dismissedAt: null } });
  return ok({ unread });
});
