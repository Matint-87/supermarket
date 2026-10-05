import { handler, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertOtpAllowed } from "@/lib/auth-service";
import { verifyOtp } from "@/lib/otp";
import { otpVerifySchema } from "@/lib/schemas";
import { setTicketCookie } from "@/lib/session";

/**
 * بررسی کد OTP. اگه درست بود یه «بلیط» ۱۰ دقیقه‌ای توی کوکی httpOnly گذاشته می‌شه
 * و کاربر باید همون‌جا رمز تعیین کنه (/api/auth/set-password). هنوز وارد حساب نشده.
 */
export const POST = handler(async (request) => {
  const { phone, purpose, code } = otpVerifySchema.parse(await readJson(request));
  const user = await prisma.user.findUnique({ where: { phone } });
  assertOtpAllowed(user, purpose);
  await verifyOtp({ phone, purpose, code });
  await setTicketCookie({ phone, purpose, tokenVersion: user?.tokenVersion ?? 0 });
  return ok({ next: "set-password" });
});
