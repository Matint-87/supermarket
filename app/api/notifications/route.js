import { z } from "zod";
import { handler, ok, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { NOTIFICATIONS_PAGE_SIZE } from "@/lib/notification-constants";
import { uuidSchema } from "@/lib/schemas";

const toPublic = (n) => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  url: n.url,
  readAt: n.readAt ? n.readAt.toISOString() : null,
  createdAt: n.createdAt.toISOString(),
});

/** آخرین اعلان‌های کاربر جاری + تعداد خوانده‌نشده‌ها */
export const GET = handler(async () => {
  const user = await requireApiUser();
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: NOTIFICATIONS_PAGE_SIZE,
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return ok({ notifications: rows.map(toPublic), unread });
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
      where: { userId: user.id, readAt: null, ...(all ? {} : { id: { in: ids } }) },
      data: { readAt: new Date() },
    });
  }
  const unread = await prisma.notification.count({ where: { userId: user.id, readAt: null } });
  return ok({ unread });
});
