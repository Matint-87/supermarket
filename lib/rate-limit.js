import "server-only";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";

/**
 * شمارنده‌ی ساده‌ی پنجره‌ای روی دیتابیس (بدون Redis).
 * اگه از حد بیشتر بشه ApiError(429) پرتاب می‌کنه.
 */
export async function rateLimit(key, limit, windowSeconds, message = "تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.") {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);

  // پنجره‌ی منقضی‌شده رو پاک کن تا شمارنده از نو شروع بشه
  await prisma.rateLimit.deleteMany({ where: { key, resetAt: { lte: now } } });

  const row = await prisma.rateLimit.upsert({
    where: { key },
    create: { key, count: 1, resetAt },
    update: { count: { increment: 1 } },
  });

  if (row.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000));
    throw new ApiError(429, message, { retryAfter });
  }
}

/** یک شمارش رو پس می‌ده (مثلاً وقتی پیامک به دلیل خطای سرویس‌دهنده ارسال نشد و نباید از سهمیه‌ی کاربر کم بشه) */
export async function refundRateLimit(key) {
  await prisma.rateLimit.updateMany({ where: { key, count: { gt: 0 } }, data: { count: { decrement: 1 } } }).catch(() => {});
}

/** پاک‌سازی موردی رکوردهای قدیمی (گاهی صدا زده می‌شه) */
export async function cleanupExpired() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  await Promise.all([
    prisma.rateLimit.deleteMany({ where: { resetAt: { lte: now } } }),
    prisma.otpCode.deleteMany({ where: { createdAt: { lte: dayAgo } } }),
  ]);
}
