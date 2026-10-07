// ساخت و بررسی JWT با jose (HS256).
// عمداً import "server-only" ندارد تا proxy.js هم بتواند از آن استفاده کند؛ خود کلید فقط سمت سرور در دسترسه.
import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret } from "@/lib/config";
import { SESSION_MAX_AGE, TICKET_MAX_AGE } from "@/lib/auth-constants";

const ISSUER = "sopermarket";
// audience جدا برای هر نوع توکن تا یکی جای دیگری قابل استفاده نباشه
const SESSION_AUD = "session";
const TICKET_AUD = "otp-ticket";

/**
 * توکن نشست کاربر: sub = آیدی کاربر ، tv = نسخه‌ی توکن در دیتابیس ، role = نقش ،
 * pc = آیا حساب کاربری کامل شده (اطلاعات شخصی + حداقل یک آدرس)؛ برای اینکه proxy.js بتونه
 * بدون دیتابیس تشخیص بده کاربرِ نیمه‌کاره باید به «تکمیل حساب» هدایت بشه یا نه.
 */
export async function signSessionToken({ userId, role, tokenVersion, profileCompleted }) {
  return new SignJWT({ role, tv: tokenVersion, pc: Boolean(profileCompleted) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(SESSION_AUD)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getAuthSecret());
}

/** فقط امضا و انقضا رو چک می‌کنه (بدون دیتابیس). اگه معتبر نبود null. */
export async function verifySessionToken(token) {
  // کلید بیرون از try تا اگه AUTH_SECRET تنظیم نشده باشه خطا واضح دیده بشه، نه اینکه همه «بیرون‌افتاده» به نظر برسن
  const key = getAuthSecret();
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: SESSION_AUD,
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string" || typeof payload.tv !== "number") return null;
    return {
      sub: payload.sub,
      tv: payload.tv,
      role: payload.role === "ADMIN" ? "ADMIN" : "USER",
      // توکن‌های قدیمی (قبل از اضافه‌شدن این فیلد) کلاً pc ندارن؛ اونا رو «کامل» فرض می‌کنیم
      // تا کاربرهای واردشده‌ی قبلی ناگهان قفل نشن — فقط از اولین ورودِ بعدی، pc واقعی توی توکن می‌شینه.
      pc: payload.pc !== false,
      // زمان صدور (ثانیه)؛ proxy.js برای تمدید خودکار نشست ازش استفاده می‌کنه
      iat: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}

/** بلیط ۱۰ دقیقه‌ای بعد از تأیید OTP؛ فقط برای /api/auth/set-password */
export async function signTicket({ phone, purpose, tokenVersion }) {
  return new SignJWT({ phone, purpose, tv: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(TICKET_AUD)
    .setIssuedAt()
    .setExpirationTime(`${TICKET_MAX_AGE}s`)
    .sign(getAuthSecret());
}

export async function verifyTicket(token) {
  const key = getAuthSecret();
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: ISSUER,
      audience: TICKET_AUD,
      algorithms: ["HS256"],
    });
    const { phone, purpose, tv } = payload;
    if (typeof phone !== "string" || typeof tv !== "number") return null;
    if (purpose !== "LOGIN" && purpose !== "RESET_PASSWORD") return null;
    return { phone, purpose, tv };
  } catch {
    return null;
  }
}
