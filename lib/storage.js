import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";

/*
  ذخیره‌سازی عکس‌ها (محصول، بنر، آواتار) — توی خود دیتابیس.

  چرا دیتابیس؟ دیسک Vercel فقط‌خواندنی و موقتیه (نوشتن توی public/uploads جواب نمی‌ده) و این راه به هیچ سرویس
  یا تنظیم اضافه‌ای نیاز نداره؛ همون Postgres که سایت داره کافیه.
  هر عکس موقع آپلود کوچیک و به WebP تبدیل می‌شه (معمولاً چند ده کیلوبایت) و با مسیر /api/images/<id> سرو می‌شه
  (app/api/images/[id]/route.js). آدرس هر عکس یکتاست، پس برای همیشه توی CDN کش می‌شه.
*/

export const IMAGE_FOLDERS = ["products", "banners", "avatars"];
export const ALLOWED_IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Vercel بدنه‌ی درخواست توابع سروری رو روی ۴.۵ مگابایت محدود می‌کنه؛ پس سقف آپلود نباید از ۴ مگابایت بیشتر بشه
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// بیشترین ابعاد (پیکسل) بعد از کوچک‌سازی؛ بنر پهنه، آواتار کوچیکه
const MAX_DIMENSION = { products: 1000, banners: 2000, avatars: 512 };

// آدرس عکس‌های ذخیره‌شده توی دیتابیس
export const IMAGE_URL_RE = /^\/api\/images\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const LEGACY_ROOT = path.join(process.cwd(), "public", "uploads");

// سقف تعداد پیکسل ورودی (جلوی «بمب فشرده‌سازی»: فایل چند مگابایتی که موقع باز شدن چند گیگ رم می‌خوره)
const MAX_INPUT_PIXELS = 50_000_000;
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

/** امضای واقعی فایل (magic bytes) باید JPEG / PNG / WebP باشه؛ Content-Type که کلاینت می‌فرسته قابل اعتماد نیست */
function hasImageSignature(buf) {
  if (buf.length < 12) return false;
  const jpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const png = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP";
  return jpeg || png || webp;
}

const INVALID_IMAGE = "فایل انتخاب‌شده یک عکس سالم (JPG، PNG یا WebP) نیست";

/**
 * عکس رو اعتبارسنجی، کوچیک و از نو به WebP تبدیل می‌کنه.
 * فایل اصلی «هیچ‌وقت» ذخیره نمی‌شه: اگه عکس واقعی نباشه رد می‌شه، و خروجی همیشه یه WebP تمیزه
 * (متادیتا/EXIF/GPS و هر داده‌ی پنهان یا اسکریپتِ چسبیده به فایل حذف می‌شه).
 */
async function optimize(file, folder) {
  const original = Buffer.from(await file.arrayBuffer());
  if (!hasImageSignature(original)) throw new ApiError(400, INVALID_IMAGE);
  const opts = { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS, sequentialRead: true };
  try {
    const meta = await sharp(original, opts).metadata();
    if (!ALLOWED_FORMATS.includes(meta.format) || !meta.width || !meta.height) throw new Error("bad format");
    const max = MAX_DIMENSION[folder];
    const data = await sharp(original, opts)
      .rotate() // جهت درست عکس‌های موبایل (EXIF)
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    return { data, contentType: "image/webp" };
  } catch (err) {
    console.error("[storage] عکس نامعتبر یا خراب رد شد:", err?.message);
    throw new ApiError(400, INVALID_IMAGE);
  }
}

/**
 * بدنه‌ی multipart رو با چند لایه‌ی دفاعی می‌خونه و فایل عکس رو برمی‌گردونه:
 * قبل از خوندنِ بدنه، Content-Length چک می‌شه تا آپلودِ غول‌پیکر رم سرور رو پر نکنه؛ بعد نوع و حجم فایل.
 * (محتوای واقعی عکس بعداً توی saveImage با sharp راستی‌آزمایی می‌شه.)
 */
export async function readImageUpload(request, { field, maxBytes = MAX_UPLOAD_BYTES }) {
  const mb = Math.round(maxBytes / (1024 * 1024)).toLocaleString("fa-IR");
  if (!(request.headers.get("content-type") || "").startsWith("multipart/form-data")) {
    throw new ApiError(415, "درخواست نامعتبر است");
  }
  const length = Number(request.headers.get("content-length"));
  if (!Number.isFinite(length) || length <= 0) throw new ApiError(411, "حجم درخواست مشخص نیست");
  if (length > maxBytes + 64 * 1024) throw new ApiError(413, `حجم عکس نباید بیشتر از ${mb} مگابایت باشد`);

  let form;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "فایل ارسالی خوانده نشد");
  }
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) throw new ApiError(400, "فایلی انتخاب نشده است");
  if (!ALLOWED_IMAGE_TYPES[file.type]) throw new ApiError(400, "فقط عکس با فرمت JPG، PNG یا WebP قابل قبول است");
  if (file.size > maxBytes) throw new ApiError(400, `حجم عکس نباید بیشتر از ${mb} مگابایت باشد`);
  return file;
}

/** یک عکس رو توی دیتابیس ذخیره می‌کنه و آدرس عمومی‌ش (/api/images/<id>) رو برمی‌گردونه. folder: یکی از IMAGE_FOLDERS */
export async function saveImage({ folder, file }) {
  if (!IMAGE_FOLDERS.includes(folder)) throw new Error(`پوشه‌ی نامعتبر: ${folder}`);
  const { data, contentType } = await optimize(file, folder);
  const row = await prisma.storedImage.create({
    data: { folder, contentType, data, size: data.length },
    select: { id: true },
  });
  return `/api/images/${row.id}`;
}

/**
 * عکس قدیمی رو پاک می‌کنه. خطاها عمداً بلعیده می‌شن (نبودن عکس مهم نیست).
 * folder: فقط عکسی پاک می‌شه که واقعاً توی همون بخش باشه؛ پس آدرس دلخواهِ ذخیره‌شده توی دیتابیس
 * نمی‌تونه باعث پاک‌شدن عکس بخش دیگه‌ای (مثلاً بنر) بشه.
 */
export async function deleteImage(url, folder) {
  if (!url || typeof url !== "string" || !IMAGE_FOLDERS.includes(folder)) return;
  try {
    const match = IMAGE_URL_RE.exec(url);
    if (match) {
      await prisma.storedImage.deleteMany({ where: { id: match[1], folder } });
      return;
    }
    // عکس‌های قدیمیِ آپلودشده روی سیستم خودت (قبل از این تغییر) — روی Vercel وجود ندارن
    if (url.startsWith(`/uploads/${folder}/`) && !process.env.VERCEL) {
      const filePath = path.join(process.cwd(), "public", url);
      if (filePath.startsWith(path.join(LEGACY_ROOT, folder) + path.sep)) await unlink(filePath);
    }
  } catch {
    // مهم نیست
  }
}
