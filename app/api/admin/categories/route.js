import { handler, ok } from "@/lib/api";
import { fetchCategoriesPage, parseCursor } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";

/** فقط ادمین: لیست همه‌ی دسته‌بندی‌ها (با تعداد محصولات)، ۱۰تا۱۰تا */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchCategoriesPage(parseCursor(sp.cursor));
  return ok({ categories: items, nextCursor, total });
});
