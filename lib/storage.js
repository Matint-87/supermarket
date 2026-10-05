import "server-only";
import { unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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

/** عکس رو کوچیک و WebP می‌کنه؛ اگه پردازش نشد (مثلاً فرمت عجیب) همون فایل اصلی ذخیره می‌شه */
async function optimize(file, folder) {
  const original = Buffer.from(await file.arrayBuffer());
  try {
    const max = MAX_DIMENSION[folder];
    const data = await sharp(original, { failOn: "none" })
      .rotate() // جهت درست عکس‌های موبایل (EXIF)
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    // اگه نسخه‌ی بهینه بزرگ‌تر از اصل شد، اصل رو نگه می‌داریم
    if (data.length < original.length) return { data, contentType: "image/webp" };
  } catch (err) {
    console.error("[storage] پردازش عکس شکست خورد؛ فایل اصلی ذخیره می‌شه:", err?.message);
  }
  return { data: original, contentType: file.type };
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
