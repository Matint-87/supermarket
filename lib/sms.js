// ارسال پیامک OTP.
// SMS_PROVIDER در .env مشخص می‌کنه:
//   console   → فقط برای توسعه: کد رو توی ترمینال (و پاسخ API) نشون می‌ده، پیامکی نمی‌فرسته
//   smsir     → سرویس «ارسال سریع» (Verify) سامانه‌ی sms.ir (نیاز به قالب/template تأییدشده)
//   kavenegar → سرویس «Verify Lookup» کاوه‌نگار (نیاز به الگو/template)
import "server-only";
import { isProd } from "@/lib/config";
import { OTP_TTL_SECONDS } from "@/lib/auth-constants";
import { toFaDigits } from "@/lib/phone";

/**
 * مقدار متغیر محیطی رو تمیز می‌کنه. موقع paste توی Vercel معمولاً کوتیشن ("kavenegar") یا فاصله/اینتر اضافه می‌شه
 * و بدون این پاک‌سازی provider «نامعتبر» یا کلید API خراب می‌شد.
 */
function env(name) {
  return (process.env[name] ?? "").trim().replace(/^["']+|["']+$/g, "").trim();
}

export function getSmsProvider() {
  return (env("SMS_PROVIDER") || (isProd ? "" : "console")).toLowerCase();
}

/** آیا کد باید در پاسخ API هم برگردونده بشه؟ فقط در حالت توسعه و provider=console */
export function exposeDevCode() {
  return !isProd && getSmsProvider() === "console";
}

/**
 * ارسال کد با «ارسال سریع» (Verify) سامانه‌ی sms.ir
 * مستندات: POST https://api.sms.ir/v1/send/verify  (هدر x-api-key)
 * بدنه: { mobile, templateId, parameters: [{ name, value }] }
 * جواب موفق: { status: 1, message: "موفق", data: { messageId, cost } }
 */
async function sendSmsIr(phone, code) {
  const apiKey = env("SMSIR_API_KEY");
  const templateId = Number(env("SMSIR_OTP_TEMPLATE_ID"));
  // اسم پارامتر باید دقیقاً همونی باشه که توی متن قالب بین #...# نوشتی (مثلاً #CODE# → CODE)
  const paramName = env("SMSIR_OTP_PARAM_NAME") || "CODE";
  // قالب «این کد به مدت #TIME# معتبر است» پارامتر دومی داره: مدت اعتبار (مثلاً «۳ دقیقه»).
  // اگه قالبت #TIME# نداره، SMSIR_OTP_TIME_PARAM_NAME رو خالی بذار تا فرستاده نشه.
  const timeName =
    process.env.SMSIR_OTP_TIME_PARAM_NAME === undefined ? "TIME" : env("SMSIR_OTP_TIME_PARAM_NAME");
  const ttlText = `${toFaDigits(Math.round(OTP_TTL_SECONDS / 60))} دقیقه`;
  const parameters = [{ name: paramName, value: code }];
  if (timeName) parameters.push({ name: timeName, value: ttlText });
  if (!apiKey || !Number.isInteger(templateId) || templateId <= 0) {
    throw new Error("SMSIR_API_KEY و SMSIR_OTP_TEMPLATE_ID (عدد) باید در .env تنظیم شوند.");
  }
  // کلید API توی هدر هست؛ هیچ‌جا لاگش نمی‌کنیم
  const res = await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      mobile: phone,
      templateId,
      parameters,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.status !== 1) {
    throw new Error(
      `SMS.ir error: http=${res.status} status=${data?.status} message=${data?.message}`,
    );
  }
}

async function sendKavenegar(phone, code) {
  const apiKey = env("KAVENEGAR_API_KEY");
  const template = env("KAVENEGAR_OTP_TEMPLATE");
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
    case "smsir":
      return sendSmsIr(phone, code);
    case "kavenegar":
      return sendKavenegar(phone, code);
    default:
      throw new Error(
        `SMS_PROVIDER ("${provider}") نامعتبر یا تنظیم‌نشده است. مقادیر مجاز: console | smsir | kavenegar`,
      );
  }
}
