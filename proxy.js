// Proxy (در Next.js 16 جایگزین middleware شده): چک سریع و «خوش‌بینانه»ی ورود قبل از رندر صفحه.
// فقط امضا/انقضای JWT رو می‌بینه (بدون دیتابیس). بررسی واقعی (کاربر بن نشده، tokenVersion، نقش)
// توی خود صفحه‌ها با lib/dal.js انجام می‌شه؛ این فقط جلوی رندر بی‌خودی رو می‌گیره.
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE, SESSION_RENEW_AFTER } from "@/lib/auth-constants";
import { signSessionToken, verifySessionToken } from "@/lib/token";

// این مسیرها بدون ورود قابل دیدن نیستن
const AUTH_REQUIRED_PREFIXES = ["/admin", "/profile", "/complete-profile"];

// وقتی حساب کاربری هنوز کامل نشده (اطلاعات شخصی + حداقل یک آدرس)، فقط همین مسیرها مجازن؛
// هر URL دیگه‌ای از سایت به «تکمیل حساب» ریدایرکت می‌شه تا کاربر وسط ثبت‌نام از فرآیند خارج نشه.
// (/admin هم اینجاست چون حساب‌های ادمین معمولاً با اسکریپت ساخته می‌شن و پروفایل/آدرس ندارن.)
function allowedWhileIncomplete(pathname) {
  return (
    pathname === "/complete-profile" ||
    pathname.startsWith("/complete-profile/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

function isAuthRequired(pathname) {
  return AUTH_REQUIRED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * تمدید خودکار نشست (sliding session): اگه کاربر لاگین‌ـه و توکنش بیشتر از یک روز از صدورش گذشته،
 * یه توکن تازه‌ی ۳۰ روزه می‌سازیم. نتیجه: تا وقتی کاربر حداقل هر ۳۰ روز یه بار سر می‌زنه، هیچ‌وقت لاگ‌اوت نمی‌شه.
 * (فقط همون داده‌های قبلیِ توکن کپی می‌شه؛ بررسی واقعی tokenVersion/بن‌بودن هنوز توی lib/dal.js انجام می‌شه،
 * پس توکن باطل‌شده با تمدید دوباره معتبر نمی‌شه.)
 */
async function renewedToken(session) {
  if (!session?.iat) return null;
  const age = Math.floor(Date.now() / 1000) - session.iat;
  if (age < SESSION_RENEW_AFTER) return null;
  return signSessionToken({
    userId: session.sub,
    role: session.role,
    tokenVersion: session.tv,
    profileCompleted: session.pc,
  });
}

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // اگه تمدید لازم بود، کوکی جدید روی پاسخ (چه صفحه، چه ریدایرکت) گذاشته می‌شه
  const fresh = await renewedToken(session);
  const withRenewal = (response) => {
    if (fresh) {
      response.cookies.set(SESSION_COOKIE, fresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // مثل lib/session.js
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
    }
    return response;
  };

  if (isAuthRequired(pathname) && !session) {
    const url = new URL("/auth/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && session && session.role !== "ADMIN") {
    return withRenewal(NextResponse.redirect(new URL("/", request.url)));
  }

  // کاربرِ واردشده‌ای که هنوز حسابش کامل نیست، تا تمومش نکنه نباید بتونه به بقیه‌ی صفحات سایت بره.
  // نکته: pc فقط یه چک سریعِ خوش‌بینانه از روی JWTه (مثل بقیه‌ی این فایل)، پس اگه همین الان
  // (توی همین رفت‌وآمد) کامل شده باشه ولی توکن هنوز رفرش نشده، یه ریدایرکت اضافه‌ی چندلحظه‌ای ممکنه
  // پیش بیاد که با ریدایرکت خودکار داخل CompleteProfileWizard برطرف می‌شه.
  if (session && !session.pc && !allowedWhileIncomplete(pathname)) {
    const url = new URL("/complete-profile", request.url);
    url.searchParams.set("next", pathname + search);
    return withRenewal(NextResponse.redirect(url));
  }

  return withRenewal(NextResponse.next());
}

// همه‌ی صفحات سایت (به‌جز فایل‌های استاتیک/اینترنال، API و صفحات auth) از این عبور می‌کنن —
// چون محدودیتِ «حساب ناقص» باید هر URL دیگه‌ای رو بگیره، نه فقط مسیرهای نیازمند ورود.
// /auth عمداً بیرونه: اگه توکن امضای درست ولی کاربر بن/توکن باطل باشه، ریدایرکت رفت‌وبرگشتی (loop) ساخته می‌شد؛
// صفحه‌ی ورود خودش (LoginFlow) کاربرِ واردشده رو به مسیر درست می‌فرسته.
export const config = {
  matcher: ["/((?!api|auth|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|sounds|icon.png|icon-192.png|icon-512.png|icon-maskable-512.png|favicon.ico|apple-icon.png|og-default.png|images|uploads).*)"],
};
