import { handler, ok } from "@/lib/api";
import { fetchOrdersPage, parseCursor, parseOrderFilters } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";

/** فقط ادمین: لیست سفارش‌ها، ۱۰تا۱۰تا (cursor = id آخرین سفارش صفحه‌ی قبل) + فیلترهای q و status */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchOrdersPage(parseOrderFilters(sp), parseCursor(sp.cursor));
  return ok({ orders: items, nextCursor, total });
});
