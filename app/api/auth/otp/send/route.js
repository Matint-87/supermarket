import { getClientIp, handler, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertOtpAllowed } from "@/lib/auth-service";
import { sendOtp } from "@/lib/otp";
import { otpSendSchema } from "@/lib/schemas";

/**
 * ارسال مجدد کد، یا شروع «فراموشی رمز عبور» (purpose = RESET_PASSWORD)
 *  - دکمه‌ی «ارسال مجدد» بدنه‌ی { resend: true } می‌فرسته → فاصله‌ی ۳ دقیقه‌ای حتماً رعایت می‌شه
 *  - بدون resend (مثل «فراموشی رمز») اگه کد قبلی هنوز معتبره، همون ادامه پیدا می‌کنه و پیامک تازه نمی‌ره
 */
export const POST = handler(async (request) => {
  const body = await readJson(request);
  const { phone, purpose } = otpSendSchema.parse(body);
  const reuse = body.resend !== true;
  const ip = await getClientIp();
  const user = await prisma.user.findUnique({ where: { phone } });
  assertOtpAllowed(user, purpose);
  const otp = await sendOtp({ phone, purpose, ip, reuse });
  return ok({ phone, purpose, ...otp });
});
