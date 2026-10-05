// سرو عکس‌های ذخیره‌شده توی دیتابیس (محصول، بنر، آواتار). عمومیه؛ مثل فایل‌های public.
// آدرس هر عکس یکتاست و هیچ‌وقت محتواش عوض نمی‌شه، پس برای همیشه (immutable) توی مرورگر و CDN کش می‌شه.
import { prisma } from "@/lib/db";
import { IMAGE_URL_RE } from "@/lib/storage";

const CACHE = "public, max-age=31536000, s-maxage=31536000, immutable";

export async function GET(request, { params }) {
  const { id } = await params;
  if (!IMAGE_URL_RE.test(`/api/images/${id}`)) return new Response("Not found", { status: 404 });

  const etag = `"${id}"`;
  // مرورگر همین عکس رو داره؛ بدون خوندن دیتا از دیتابیس جواب می‌دیم
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": CACHE } });
  }

  let image = null;
  try {
    image = await prisma.storedImage.findUnique({ where: { id }, select: { contentType: true, data: true } });
  } catch (err) {
    console.error("[images]", err);
    return new Response("Server error", { status: 500 });
  }
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(image.data, {
    headers: {
      "Content-Type": image.contentType,
      "Content-Length": String(image.data.length),
      "Cache-Control": CACHE,
      ETag: etag,
      // جلوگیری از اجرای فایل به‌عنوان نوع دیگه (مثلاً HTML) در مرورگر
      "X-Content-Type-Options": "nosniff",
    },
  });
}
