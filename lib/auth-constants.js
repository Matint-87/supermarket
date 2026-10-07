// ثابت‌های احراز هویت — بدون import سمت‌سروری، پس هم در proxy.js و هم در کلاینت قابل استفاده‌ست.

export const SESSION_COOKIE = "session";
/** کوکی کوتاه‌مدتی که بعد از تأیید موفق OTP داده می‌شه و فقط برای تعیین/تغییر رمز به کار می‌ره */
export const TICKET_COOKIE = "otp_ticket";
export const TICKET_COOKIE_PATH = "/api/auth";

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // ۳۰ روز (ثانیه)
/** نشست «لغزنده»: تا وقتی کاربر فعاله، هر بار که سنِ توکن از این مقدار بیشتر شد، توکن جدید ۳۰ روزه صادر می‌شه */
export const SESSION_RENEW_AFTER = 24 * 60 * 60; // ۱ روز (ثانیه)
export const TICKET_MAX_AGE = 10 * 60; // ۱۰ دقیقه

export const OTP_LENGTH = 6;
export const OTP_TTL_SECONDS = 3 * 60; // اعتبار کد
export const OTP_RESEND_SECONDS = 60; // فاصله‌ی حداقلی بین دو درخواست کد
export const OTP_MAX_ATTEMPTS = 5; // تعداد تلاش اشتباه برای هر کد

export const LOGIN_MAX_FAILS = 5; // بعد از این تعداد رمز اشتباه، حساب موقتاً قفل می‌شه
export const LOGIN_LOCK_MINUTES = 15;

export const MAX_ADDRESSES = 10;
