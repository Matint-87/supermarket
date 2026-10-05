import { handler, ok } from "@/lib/api";
import { fetchAddressesPage, parseAddressFilters, parseCursor } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";

/** فقط ادمین: آدرس‌های ثبت‌شده‌ی همه‌ی کاربران، ۱۰تا۱۰تا + فیلترهای q و province */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchAddressesPage(parseAddressFilters(sp), parseCursor(sp.cursor));
  return ok({ addresses: items, nextCursor, total });
});
