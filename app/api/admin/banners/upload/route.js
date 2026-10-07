// آپلود عکس بنر (فقط ادمین): فقط ذخیره می‌کنه و آدرس رو برمی‌گردونه؛ ثبت خودِ بنر با imageUrl از همین آدرس انجام می‌شه.
import { handler, ok } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { rateLimit } from "@/lib/rate-limit";
import { readImageUpload, saveImage } from "@/lib/storage";

export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  await rateLimit(`upload:${admin.id}`, 60, 600, "تعداد آپلودها زیاد بوده؛ کمی بعد تلاش کنید");

  // بررسی Content-Length/نوع/حجم؛ بعد در saveImage محتوای واقعی عکس راستی‌آزمایی و دوباره‌سازی می‌شه
  const file = await readImageUpload(request, { field: "image" });
  const imageUrl = await saveImage({ folder: "banners", file });
  return ok({ imageUrl }, { status: 201 });
});
