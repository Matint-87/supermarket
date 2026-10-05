// منطق اصلی ورود و تعیین رمز. route handlerها فقط ورودی رو اعتبارسنجی می‌کنن و این توابع رو صدا می‌زنن.
import "server-only";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/password";
import { checkPassword } from "@/lib/validators";
import { isOnboarded } from "@/lib/dal";
import { clearTicketCookie, createSession } from "@/lib/session";
import { LOGIN_LOCK_MINUTES, LOGIN_MAX_FAILS } from "@/lib/auth-constants";

const BANNED_MESSAGE = "حساب کاربری شما مسدود شده است. با پشتیبانی تماس بگیرید";

/** آیا برای این کاربر و این هدف اجازه‌ی ارسال/تأیید OTP هست؟ */
export function assertOtpAllowed(user, purpose) {
  if (user && !user.isActive) throw new ApiError(403, BANNED_MESSAGE);
  if (purpose === "LOGIN" && user?.passwordHash) {
    throw new ApiError(409, "این شماره قبلاً ثبت‌نام کرده است. با رمز عبور وارد شوید");
  }
  if (purpose === "RESET_PASSWORD" && !user?.passwordHash) {
    throw new ApiError(404, "حساب کاربری با رمز عبور برای این شماره پیدا نشد");
  }
}

/** ورود با شماره و رمز. در صورت موفقیت سشن (کوکی JWT) ساخته می‌شه. */
export async function loginWithPassword({ phone, password, ip }) {
  await rateLimit(`login:ip:${ip}`, 30, 600);
  await rateLimit(
    `login:phone:${phone}`,
    10,
    900,
    "تلاش‌های ورود زیاد بوده است. ۱۵ دقیقه دیگر دوباره امتحان کنید",
  );

  const user = await prisma.user.findUnique({ where: { phone } });
  const badCredentials = () => new ApiError(401, "شماره موبایل یا رمز عبور اشتباه است");

  if (!user || !user.passwordHash) {
    // زمان پاسخ نباید لو بده که این شماره وجود داره یا نه
    await burnPasswordCheck(password);
    throw badCredentials();
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
    throw new ApiError(
      429,
      `به دلیل چند بار رمز اشتباه، ورود با رمز تا ${minutes} دقیقه‌ی دیگر بسته است. می‌توانید از «فراموشی رمز عبور» استفاده کنید`,
      { retryAfter: minutes * 60 },
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    const { failedLoginCount } = await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });
    if (failedLoginCount >= LOGIN_MAX_FAILS) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: 0,
          lockedUntil: new Date(now.getTime() + LOGIN_LOCK_MINUTES * 60_000),
        },
      });
    }
    throw badCredentials();
  }

  // وضعیت مسدود بودن فقط به کسی گفته می‌شه که رمز درست رو می‌دونه
  if (!user.isActive) throw new ApiError(403, BANNED_MESSAGE);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });
  await createSession(updated, { profileCompleted: await isOnboarded(updated) });
  return updated;
}

const TICKET_EXPIRED = "مهلت تأیید شماره تمام شده است. دوباره کد دریافت کنید";

/**
 * بعد از تأیید OTP: رمز رو تعیین می‌کنه (کاربر جدید → ساخته می‌شه ، کاربر بدون رمز → رمز می‌گیره ،
 * فراموشی رمز → رمز عوض می‌شه و همه‌ی نشست‌های قدیمی باطل می‌شن) و وارد حساب می‌کنه.
 */
export async function completePasswordSetup({ ticket, password }) {
  const problem = checkPassword(password, ticket.phone);
  if (problem) throw new ApiError(400, problem, { fields: { password: problem } });

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const alreadyHasPassword = () =>
    new ApiError(409, "برای این شماره قبلاً رمز عبور تعیین شده است. با رمز وارد شوید");

  const existing = await prisma.user.findUnique({ where: { phone: ticket.phone } });
  if (existing && !existing.isActive) throw new ApiError(403, BANNED_MESSAGE);

  let user;

  if (ticket.purpose === "LOGIN") {
    if (existing?.passwordHash) throw alreadyHasPassword();

    if (!existing) {
      try {
        user = await prisma.user.create({
          data: { phone: ticket.phone, passwordHash, phoneVerifiedAt: now, lastLoginAt: now },
        });
      } catch (err) {
        if (err?.code === "P2002") throw alreadyHasPassword(); // هم‌زمان کسی دیگه ساخته
        throw err;
      }
    } else {
      // شرط passwordHash: null جلوی استفاده‌ی دوباره از همین بلیط رو می‌گیره
      const res = await prisma.user.updateMany({
        where: { id: existing.id, passwordHash: null },
        data: { passwordHash, phoneVerifiedAt: existing.phoneVerifiedAt ?? now, lastLoginAt: now },
      });
      if (res.count === 0) throw alreadyHasPassword();
      user = await prisma.user.findUnique({ where: { id: existing.id } });
    }
  } else {
    // RESET_PASSWORD
    if (!existing) throw new ApiError(400, "درخواست نامعتبر است");
    try {
      // شرط tokenVersion یعنی هر بلیط فقط یک‌بار قابل استفاده‌ست
      user = await prisma.user.update({
        where: { id: existing.id, tokenVersion: ticket.tv },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
          failedLoginCount: 0,
          lockedUntil: null,
          phoneVerifiedAt: existing.phoneVerifiedAt ?? now,
          lastLoginAt: now,
        },
      });
    } catch (err) {
      if (err?.code === "P2025") throw new ApiError(401, TICKET_EXPIRED);
      throw err;
    }
  }

  await createSession(user, { profileCompleted: await isOnboarded(user) });
  await clearTicketCookie();
  return user;
}

export { TICKET_EXPIRED };
