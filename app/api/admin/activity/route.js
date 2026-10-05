import { handler, ok } from "@/lib/api";
import { fetchActivityPage, parseActivityFilters, parseCursor } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";

/** فقط ادمین: لاگ فعالیت‌ها، ۱۰تا۱۰تا + فیلترهای q, entity, action */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchActivityPage(parseActivityFilters(sp), parseCursor(sp.cursor));
  return ok({ logs: items, nextCursor, total });
});
