// روش‌های ارسال و زمان تحویل — بدون import سمت‌سروری، پس هم کلاینت و هم سرور استفاده می‌کنن.
import { normalizeText } from "./text";

export const SHIPPING_METHODS = [
  { value: "POST", label: "ارسال با پست", description: "ارسال به سراسر کشور از طریق پست" },
  { value: "COURIER", label: "ارسال با پیک", description: "تحویل درب منزل با پیک فروشگاه" },
  { value: "PICKUP", label: "دریافت حضوری از فروشگاه", description: "سفارش را خودتان از فروشگاه تحویل بگیرید" },
];

export const SHIPPING_METHOD_VALUES = SHIPPING_METHODS.map((m) => m.value);
export const SHIPPING_LABELS = Object.fromEntries(SHIPPING_METHODS.map((m) => [m.value, m.label]));

// زمان ارسال (برای عوض‌کردن زمان‌ها فقط همین‌جا رو ویرایش کن)
export const DELIVERY_TIME_TEHRAN = "۲ تا ۷ ساعت کاری";
export const DELIVERY_TIME_OTHER = "۲ تا ۷ روز کاری";

/** آیا شهر تحویل «تهران» هست؟ (شهرهای دیگه‌ی استان تهران جزو «سایر مناطق» حساب می‌شن) */
export function isTehranCity(city) {
  return normalizeText(city) === "تهران";
}

/**
 * متن زمان ارسال. اگه deliveryTime (اسنپ‌شات زمانِ محدوده/تنظیمات ارسال) داده بشه همون نشون داده می‌شه،
 * وگرنه از روی ثابت‌های بالا و شهر مقصد حساب می‌شه.
 */
export function deliveryMessage(method, city, deliveryTime) {
  if (method === "PICKUP") {
    return "سفارش شما پس از آماده‌سازی، در فروشگاه تحویل داده می‌شود.";
  }
  if (deliveryTime) return `زمان ارسال: ${deliveryTime}`;
  return isTehranCity(city)
    ? `زمان ارسال به تهران: ${DELIVERY_TIME_TEHRAN}`
    : `زمان ارسال به سایر مناطق کشور: ${DELIVERY_TIME_OTHER}`;
}
