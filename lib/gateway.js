// درگاه پرداخت آنلاین.
//  • اگه ZARINPAL_MERCHANT_ID تنظیم شده باشه، با زرین‌پال (API نسخه‌ی ۴) واقعاً پرداخت انجام می‌شه.
//  • وگرنه فقط در حالت توسعه (یا وقتی PAYMENT_SANDBOX=1 باشه) یه «درگاه آزمایشی» داخلی استفاده می‌شه
//    که صفحه‌ی /pay/sandbox رو نشون می‌ده؛ توی production بدون merchant id، پرداخت آنلاین غیرفعاله.
// برای وصل‌کردن درگاه دیگه فقط startGatewayPayment و verifyGatewayPayment رو عوض کن.
import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import { headers } from "next/headers";
import { ApiError } from "@/lib/api";

const ZP_BASE = "https://payment.zarinpal.com/pg/v4/payment";
const ZP_START = "https://payment.zarinpal.com/pg/StartPay";

export function gatewayMode() {
  if (process.env.ZARINPAL_MERCHANT_ID) return "zarinpal";
  if (process.env.NODE_ENV !== "production" || process.env.PAYMENT_SANDBOX === "1") return "sandbox";
  return "none";
}

export const sandboxEnabled = () => gatewayMode() === "sandbox";

/** آدرس پایه‌ی سایت برای callback (پشت nginx بهتره SITE_URL رو ست کنی) */
export async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function zpPost(path, body) {
  let res;
  try {
    res = await fetch(`${ZP_BASE}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(502, "ارتباط با درگاه پرداخت برقرار نشد. دوباره تلاش کنید.");
  }
  return res.json().catch(() => ({}));
}

/**
 * شروع پرداخت. amount به «تومان» (به ریال تبدیل می‌شه).
 * @returns {Promise<{authority: string, redirectUrl: string}>}
 */
export async function startGatewayPayment({ amount, orderCode, mobile }) {
  const mode = gatewayMode();
  const origin = await siteOrigin();
  const callbackUrl = `${origin}/api/payments/callback`;

  if (mode === "zarinpal") {
    const data = await zpPost("request.json", {
      merchant_id: process.env.ZARINPAL_MERCHANT_ID,
      amount: amount * 10,
      currency: "IRR",
      callback_url: callbackUrl,
      description: `پرداخت سفارش ${orderCode}`,
      metadata: { mobile },
    });
    const authority = data?.data?.authority;
    if (data?.data?.code !== 100 || !authority) {
      console.error("[gateway] zarinpal request failed", data?.errors ?? data);
      throw new ApiError(502, "اتصال به درگاه پرداخت انجام نشد. دوباره تلاش کنید.");
    }
    return { authority, redirectUrl: `${ZP_START}/${authority}` };
  }

  if (mode === "sandbox") {
    const authority = `SBX${randomBytes(15).toString("hex")}`;
    return { authority, redirectUrl: `/pay/sandbox?authority=${authority}` };
  }

  throw new ApiError(503, "پرداخت آنلاین در حال حاضر فعال نیست. از کیف پول استفاده کنید یا بعداً تلاش کنید.");
}

/** تأیید پرداخت بعد از برگشت کاربر از درگاه. @returns {Promise<{ok: boolean, refId?: string}>} */
export async function verifyGatewayPayment({ authority, amount }) {
  const mode = gatewayMode();

  if (mode === "zarinpal") {
    const data = await zpPost("verify.json", {
      merchant_id: process.env.ZARINPAL_MERCHANT_ID,
      amount: amount * 10,
      authority,
    });
    const code = data?.data?.code;
    // ۱۰۰ = موفق، ۱۰۱ = قبلاً تأیید شده
    if (code === 100 || code === 101) return { ok: true, refId: String(data.data.ref_id ?? "") };
    return { ok: false };
  }

  if (mode === "sandbox" && authority.startsWith("SBX")) {
    return { ok: true, refId: String(randomInt(100_000_000, 999_999_999)) };
  }
  return { ok: false };
}
