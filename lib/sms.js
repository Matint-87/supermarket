// ارسال پیامک OTP.
// SMS_PROVIDER در .env مشخص می‌کنه:
//   console   → فقط برای توسعه: کد رو توی ترمینال (و پاسخ API) نشون می‌ده، پیامکی نمی‌فرسته
//   kavenegar → سرویس «Verify Lookup» کاوه‌نگار (نیاز به الگو/template)
import "server-only";
import { isProd } from "@/lib/config";

export function getSmsProvider() {
  return (process.env.SMS_PROVIDER || (isProd ? "" : "console")).toLowerCase();
}

/** آیا کد باید در پاسخ API هم برگردونده بشه؟ فقط در حالت توسعه و provider=console */
export function exposeDevCode() {
  return !isProd && getSmsProvider() === "console";
}

async function sendKavenegar(phone, code) {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const template = process.env.KAVENEGAR_OTP_TEMPLATE;
  if (!apiKey || !template) {
    throw new Error("KAVENEGAR_API_KEY و KAVENEGAR_OTP_TEMPLATE باید در .env تنظیم شوند.");
  }
  // کلید API داخل آدرس هست؛ پس آدرس رو هیچ‌جا لاگ نمی‌کنیم
  const url = `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ receptor: phone, token: code, template }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.return?.status !== 200) {
    throw new Error(
      `Kavenegar error: http=${res.status} status=${data?.return?.status} message=${data?.return?.message}`,
    );
  }
}

/** کد OTP رو به شماره می‌فرسته. در صورت خطا throw می‌کنه. */
export async function sendOtpSms(phone, code) {
  const provider = getSmsProvider();
  switch (provider) {
    case "console":
      if (isProd) {
        throw new Error(
          "SMS_PROVIDER=console در حالت production مجاز نیست. یک سرویس پیامک واقعی تنظیم کنید.",
        );
      }
      console.log(`\n[OTP] ${phone}  →  ${code}\n`);
      return;
    case "kavenegar":
      return sendKavenegar(phone, code);
    default:
      throw new Error(
        `SMS_PROVIDER ("${provider}") نامعتبر یا تنظیم‌نشده است. مقادیر مجاز: console | kavenegar`,
      );
  }
}
