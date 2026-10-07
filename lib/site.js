// تنظیمات پایه‌ی سئو: آدرس اصلی سایت، نام و توضیح پیش‌فرض + ساخت آدرس مطلق.
// فقط سمت سرور استفاده می‌شه (از متغیرهای محیطی بدون NEXT_PUBLIC می‌خونه).
import { STORE_INFO } from "@/lib/store-info";

export const SITE_NAME = STORE_INFO.name;
export const SITE_DESCRIPTION =
  "خرید آنلاین مایحتاج روزانه شامل لبنیات، مواد غذایی، پروتئین، بهداشتی و شوینده با بهترین قیمت، تضمین اصالت کالا و ارسال سریع به درب منزل.";

function resolveSiteUrl() {
  const raw =
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    STORE_INFO.website ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000";
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

export const SITE_URL = resolveSiteUrl();

/** آدرس مطلق: "/products/1" → "https://example.com/products/1" (آدرس‌های کامل دست‌نخورده برمی‌گردن) */
export function absUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export const productPath = (id) => `/products/${id}`;
export const categoryPath = (id, page = 1) => (page > 1 ? `/categories/${id}?page=${page}` : `/categories/${id}`);
