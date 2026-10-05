import { ApiError, handler, ok, readJson } from "@/lib/api";
import { isOnboarded, requireApiUser, toPublicUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { profileSchema } from "@/lib/schemas";
import { createSession } from "@/lib/session";

export const GET = handler(async () => {
  const user = await requireApiUser();
  return ok({ user: toPublicUser(user) });
});

/** ذخیره‌ی اطلاعات شخصی (فرم «تکمیل اطلاعات»). نام و نام خانوادگی اجباری‌ه؛ بقیه اختیاری. */
export const PUT = handler(async (request) => {
  const user = await requireApiUser();
  const data = profileSchema.parse(await readJson(request));

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        nationalCode: data.nationalCode,
        // ستون Date؛ ساعت رو UTC نیمه‌شب می‌گیریم تا تاریخ جابه‌جا نشه
        birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00Z`) : null,
        gender: data.gender,
        smsPromoOptIn: data.smsPromoOptIn,
        // اولین باری که نام ثبت شد پروفایل «تکمیل‌شده» حساب می‌شه
        profileCompletedAt: user.profileCompletedAt ?? new Date(),
      },
    });
    // اگه با این ذخیره «کامل بودن حساب» عوض شده باشه، سشن رو رفرش کن تا proxy.js هم باخبر بشه
    await createSession(updated, { profileCompleted: await isOnboarded(updated) });
    return ok({ user: toPublicUser(updated) });
  } catch (err) {
    if (err?.code === "P2002") {
      throw new ApiError(409, "این ایمیل قبلاً برای حساب دیگری ثبت شده است", {
        fields: { email: "این ایمیل قبلاً ثبت شده است" },
      });
    }
    throw err;
  }
});
