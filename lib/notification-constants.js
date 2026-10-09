// ثابت‌های اعلان‌ها — بدون import سمت‌سروری، پس هم کلاینت و هم سرور می‌تونن استفاده کنن.

/** اعلان‌هایی که برای ادمین مهمن: صدای بلندتر + نمایش ثابت تا کلیک */
export const ADMIN_NOTIFICATION_TYPES = ["ORDER_NEW", "ORDER_CANCELED", "LOW_STOCK", "OUT_OF_STOCK"];

export const NOTIFICATION_META = {
  ORDER_NEW: { label: "سفارش جدید", tone: "text-emerald-700 bg-emerald-50" },
  ORDER_CANCELED: { label: "لغو سفارش", tone: "text-red-600 bg-red-50" },
  LOW_STOCK: { label: "موجودی کم", tone: "text-amber-700 bg-amber-50" },
  OUT_OF_STOCK: { label: "اتمام موجودی", tone: "text-red-600 bg-red-50" },
  ORDER_STATUS: { label: "وضعیت سفارش", tone: "text-sky-700 bg-sky-50" },
  ADMIN_MESSAGE: { label: "پیام فروشگاه", tone: "text-violet-700 bg-violet-50" },
};

/** سقف طول پیام دستی ادمین */
export const BROADCAST_TITLE_MAX = 120;
export const BROADCAST_BODY_MAX = 300;
/** حداکثر تعداد گیرنده‌ی انتخابی در یک ارسال */
export const BROADCAST_MAX_SELECTED = 200;

/** تعداد اعلان‌هایی که با هر بار باز کردن زنگوله لود می‌شه */
export const NOTIFICATIONS_PAGE_SIZE = 30;

/** اعلان‌های خوانده‌شده‌ی قدیمی‌تر از این تعداد روز پاک می‌شن */
export const NOTIFICATION_RETENTION_DAYS = 60;
