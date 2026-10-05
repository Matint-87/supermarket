import { handler, ok } from "@/lib/api";
import { fetchBrandsPage, parseCursor } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";

/** فقط ادمین: لیست همه‌ی برندها (با تعداد محصولات)، ۱۰تا۱۰تا */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchBrandsPage(parseCursor(sp.cursor));
  return ok({ brands: items, nextCursor, total });
});
