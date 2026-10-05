import { handler, ok } from "@/lib/api";
import { fetchProductsPage, parseCursor, parseProductFilters } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";

/** فقط ادمین: لیست همه‌ی محصولات (فعال و غیرفعال)، ۱۰تا۱۰تا. فیلترها: q, status, categoryId */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchProductsPage(parseProductFilters(sp), parseCursor(sp.cursor));
  return ok({ products: items, nextCursor, total });
});
