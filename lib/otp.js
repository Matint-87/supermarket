import "server-only";
import { randomInt, timingSafeEqual, createHmac } from "node:crypto";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { getOtpKey } from "@/lib/config";
import { rateLimit } from "@/lib/rate-limit";
import { exposeDevCode, sendOtpSms } from "@/lib/sms";
import {
  OTP_LENGTH,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  OTP_TTL_SECONDS,
} from "@/lib/auth-constants";

function generateCode() {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

/** خود کد هیچ‌جا ذخیره نمی‌شه؛ فقط HMAC اون (به شماره و هدف هم وابسته‌ست) */
function hashCode(phone, purpose, code) {
  return createHmac("sha256", getOtpKey()).update(`${phone}:${purpose}:${code}`).digest("hex");
}

/**
 * یک کد جدید می‌سازه و پیامک می‌کنه.
 * محدودیت‌ها: فاصله‌ی ۶۰ ثانیه بین دو درخواست، ۵ پیامک در ساعت برای هر شماره، ۳۰ در ساعت برای هر IP.
 */
export async function sendOtp({ phone, purpose, ip }) {
  const now = new Date();

  // ۱) فاصله‌ی حداقلی بین دو ارسال (قبل از شمارنده‌ها تا درخواست‌های زودهنگام سهمیه نسوزونن)
  const last = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (last) {
    const wait = OTP_RESEND_SECONDS - Math.floor((now - last.createdAt) / 1000);
    if (wait > 0) {
      throw new ApiError(429, `لطفاً ${wait} ثانیه دیگر برای دریافت کد جدید صبر کنید`, {
        retryAfter: wait,
      });
    }
  }

  // ۲) سقف کل (هزینه‌ی پیامک + جلوگیری از اسپم)
  await rateLimit(`otp:phone:${phone}`, 5, 3600, "تعداد درخواست کد برای این شماره زیاد بوده؛ یک ساعت دیگر تلاش کنید");
  await rateLimit(`otp:ip:${ip}`, 30, 3600, "تعداد درخواست‌ها از سمت شما زیاد بوده؛ کمی بعد تلاش کنید");

  const code = generateCode();

  // فقط آخرین کد معتبر باشه
  await prisma.otpCode.updateMany({
    where: { phone, purpose, consumedAt: null },
    data: { consumedAt: now },
  });
  const row = await prisma.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash: hashCode(phone, purpose, code),
      expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
      ip,
    },
  });

  try {
    await sendOtpSms(phone, code);
  } catch (err) {
    console.error("[sms error]", err instanceof Error ? err.message : err);
    // کدی که به دست کاربر نرسیده نباید سهمیه‌ی «فاصله‌ی ۶۰ ثانیه» رو بسوزونه
    await prisma.otpCode.delete({ where: { id: row.id } }).catch(() => {});
    throw new ApiError(503, "ارسال پیامک با مشکل مواجه شد. چند لحظه بعد دوباره تلاش کنید.");
  }

  return {
    expiresIn: OTP_TTL_SECONDS,
    resendIn: OTP_RESEND_SECONDS,
    ...(exposeDevCode() ? { devCode: code } : {}),
  };
}

/**
 * کد واردشده رو بررسی می‌کنه. اگه درست بود کد «مصرف» می‌شه (یک‌بار مصرف) و true برمی‌گردونه؛
 * وگرنه ApiError پرتاب می‌کنه.
 */
export async function verifyOtp({ phone, purpose, code }) {
  await rateLimit(`otp-verify:${phone}`, 10, 900, "تلاش‌های ناموفق زیاد بوده؛ ۱۵ دقیقه دیگر دوباره امتحان کنید");

  const otp = await prisma.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) {
    throw new ApiError(400, "کد منقضی شده است. کد جدید دریافت کنید");
  }

  // تلاش رو «قبل از مقایسه» و اتمیک می‌شماریم تا درخواست‌های موازی هم نتونن سقف رو دور بزنن
  const counted = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count === 0) {
    throw new ApiError(429, "تعداد تلاش‌های اشتباه زیاد بود. کد جدید دریافت کنید");
  }

  const expected = Buffer.from(otp.codeHash, "hex");
  const actual = Buffer.from(hashCode(phone, purpose, code), "hex");
  const match = expected.length === actual.length && timingSafeEqual(expected, actual);
  if (!match) {
    const left = OTP_MAX_ATTEMPTS - (otp.attempts + 1);
    throw new ApiError(
      400,
      left > 0 ? `کد وارد شده اشتباه است (${left} تلاش باقی مانده)` : "کد وارد شده اشتباه است. کد جدید دریافت کنید",
    );
  }

  // مصرف اتمیک: اگه دو درخواست هم‌زمان با کد درست بیان فقط یکی موفق می‌شه
  const consumed = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) {
    throw new ApiError(400, "کد قبلاً استفاده شده است. کد جدید دریافت کنید");
  }
  return true;
}
