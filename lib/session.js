import "server-only";
import { cookies } from "next/headers";
import { isProd } from "@/lib/config";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  TICKET_COOKIE,
  TICKET_COOKIE_PATH,
  TICKET_MAX_AGE,
} from "@/lib/auth-constants";
import { signSessionToken, signTicket, verifyTicket } from "@/lib/token";

function baseOptions(path = "/") {
  return {
    httpOnly: true, // جاوااسکریپت صفحه به توکن دسترسی نداره (دفاع در برابر XSS)
    secure: isProd, // در production فقط روی HTTPS ارسال می‌شه
    sameSite: "lax", // دفاع در برابر CSRF
    path,
  };
}

/**
 * بعد از ورود موفق (یا هر بار که وضعیت «کامل بودن حساب» عوض می‌شه) صدا زده می‌شه: JWT می‌سازه و توی کوکی می‌ذاره.
 * profileCompleted رو صریح پاس بده (حاصل lib/dal.js#isOnboarded)؛ اگه ندی، فقط از روی profileCompletedAt
 * خودِ کاربر حدس زده می‌شه که آدرس رو در نظر نمی‌گیره.
 */
export async function createSession(user, { profileCompleted } = {}) {
  const token = await signSessionToken({
    userId: user.id,
    role: user.role,
    tokenVersion: user.tokenVersion,
    profileCompleted: profileCompleted ?? Boolean(user.profileCompletedAt),
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, { ...baseOptions(), maxAge: SESSION_MAX_AGE });
}

export async function destroySession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...baseOptions(), maxAge: 0 });
}

export async function readSessionCookie() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** بلیط بعد از تأیید OTP */
export async function setTicketCookie({ phone, purpose, tokenVersion }) {
  const token = await signTicket({ phone, purpose, tokenVersion });
  const store = await cookies();
  store.set(TICKET_COOKIE, token, {
    ...baseOptions(TICKET_COOKIE_PATH),
    maxAge: TICKET_MAX_AGE,
  });
}

export async function readTicket() {
  const store = await cookies();
  const token = store.get(TICKET_COOKIE)?.value;
  return token ? verifyTicket(token) : null;
}

export async function clearTicketCookie() {
  const store = await cookies();
  store.set(TICKET_COOKIE, "", { ...baseOptions(TICKET_COOKIE_PATH), maxAge: 0 });
}
