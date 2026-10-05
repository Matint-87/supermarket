import { ApiError, handler, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { reverseGeocode } from "@/lib/geocode";
import { rateLimit } from "@/lib/rate-limit";
import { isInIran } from "@/lib/validators";

/**
 * GET /api/geo/reverse?lat=..&lng=..
 * از روی نقطه‌ی انتخاب‌شده روی نقشه، استان/شهر/محله/خیابان (و در صورت وجود کد پستی) رو حدس می‌زنه.
 * فقط برای کاربر واردشده (تا سرور ما یک پروکسی باز برای سرویس ژئوکد نشه) و با سقف تعداد درخواست.
 */
export const GET = handler(async (request) => {
  const user = await requireApiUser();

  const sp = request.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  if (!isInIran(lat, lng)) throw new ApiError(400, "موقعیت انتخاب‌شده خارج از ایران است");

  await rateLimit(`geo:${user.id}`, 40, 600, "تعداد درخواست‌های نقشه زیاد بوده؛ کمی بعد تلاش کنید");
  return ok(await reverseGeocode(lat, lng));
});
