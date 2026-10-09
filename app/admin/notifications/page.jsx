import NotificationsAdmin from "@/components/admin/NotificationsAdmin";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";

export const metadata = { title: "ارسال پیام به کاربران | پنل مدیریت" };
export const dynamic = "force-dynamic";

const PAGE = 20;

export default async function AdminNotificationsPage() {
  await requireAdmin();
  const [rows, total] = await Promise.all([
    prisma.notificationBroadcast.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: PAGE + 1 }),
    prisma.notificationBroadcast.count(),
  ]);
  const hasMore = rows.length > PAGE;
  const page = hasMore ? rows.slice(0, PAGE) : rows;
  const reads = page.length
    ? await prisma.notification.groupBy({
        by: ["broadcastId"],
        where: { broadcastId: { in: page.map((b) => b.id) }, readAt: { not: null } },
        _count: { _all: true },
      })
    : [];
  const readMap = new Map(reads.map((r) => [r.broadcastId, r._count._all]));

  const initial = {
    broadcasts: page.map((b) => ({
      id: b.id,
      title: b.title,
      body: b.body,
      url: b.url,
      audience: b.audience,
      adminName: b.adminName,
      recipientCount: b.recipientCount,
      readCount: readMap.get(b.id) ?? 0,
      createdAt: b.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? page[page.length - 1].id : null,
    total,
  };
  return <NotificationsAdmin initial={initial} />;
}
