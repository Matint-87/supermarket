import "server-only";
import { createHmac } from "node:crypto";

function need(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `متغیر محیطی ${name} تنظیم نشده. فایل .env رو با .env.example مقایسه کن.`,
    );
  }
  return v;
}

let cachedSecret;

/** کلید امضای JWT — حداقل ۳۲ کاراکتر */
export function getAuthSecret() {
  if (cachedSecret) return cachedSecret;
  const secret = need("AUTH_SECRET");
  if (secret.length < 32) {
    throw new Error(
      "AUTH_SECRET باید حداقل ۳۲ کاراکتر باشه. برای ساختنش: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
    );
  }
  cachedSecret = new TextEncoder().encode(secret);
  return cachedSecret;
}

/** کلید HMAC برای هش کردن کدهای OTP — از AUTH_SECRET مشتق می‌شه */
export function getOtpKey() {
  need("AUTH_SECRET");
  return createHmac("sha256", process.env.AUTH_SECRET).update("otp-v1").digest();
}

export const isProd = process.env.NODE_ENV === "production";
