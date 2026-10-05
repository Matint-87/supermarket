import { getClientIp, handler, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { assertOtpAllowed } from "@/lib/auth-service";
import { sendOtp } from "@/lib/otp";
import { otpSendSchema } from "@/lib/schemas";

/** ارسال مجدد کد، یا شروع «فراموشی رمز عبور» (purpose = RESET_PASSWORD) */
export const POST = handler(async (request) => {
  const { phone, purpose } = otpSendSchema.parse(await readJson(request));
  const ip = await getClientIp();
  const user = await prisma.user.findUnique({ where: { phone } });
  assertOtpAllowed(user, purpose);
  const otp = await sendOtp({ phone, purpose, ip });
  return ok({ phone, purpose, ...otp });
});
