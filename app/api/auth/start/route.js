import { ApiError, getClientIp, handler, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { sendOtp } from "@/lib/otp";
import { startSchema } from "@/lib/schemas";

/**
 * قدم اول ورود/ثبت‌نام: کاربر شماره‌ش رو می‌ده.
 *  - رمز داره        → step: "password"
 *  - جدیده/رمز نداره → پیامک OTP می‌فرسته → step: "otp"
 */
export const POST = handler(async (request) => {
  const { phone } = startSchema.parse(await readJson(request));
  const ip = await getClientIp();
  await rateLimit(`start:ip:${ip}`, 60, 600);

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { passwordHash: true, isActive: true },
  });
  if (user && !user.isActive) {
    throw new ApiError(403, "حساب کاربری شما مسدود شده است. با پشتیبانی تماس بگیرید");
  }
  if (user?.passwordHash) return ok({ step: "password", phone });

  // reuse: اگه کد قبلی هنوز معتبره (مثلاً کاربر صفحه رو رفرش کرده)، پیامک تازه نمی‌فرسته و همون رو ادامه می‌ده
  const otp = await sendOtp({ phone, purpose: "LOGIN", ip, reuse: true });
  return ok({ step: "otp", phone, purpose: "LOGIN", isNew: !user, ...otp });
});
