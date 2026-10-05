// ثابت‌های پنل مدیریت — بدون import سمت‌سروری، پس هم کلاینت و هم سرور می‌تونن استفاده کنن.

/** هر لیست پنل مدیریت هر بار همین‌قدر آیتم لود می‌کنه (لود تنبل: با رسیدن اسکرول به انتها، ۱۰ تای بعدی) */
export const ADMIN_LOAD_SIZE = 10;

/** حداکثر تعداد بنرهای اسلایدر صفحه‌ی اصلی */
export const MAX_BANNERS = 10;

/** سفارش‌های یک کاربر (صفحه‌ی جزئیات کاربر) صفحه‌بندی‌شده نمایش داده می‌شن؛ تعداد در هر صفحه */
export const USER_ORDERS_PAGE_SIZES = [10, 20];

/** محصولی که موجودی‌اش کمتر یا مساوی این عدد باشه «کم‌موجود» حساب می‌شه */
export const LOW_STOCK_THRESHOLD = 5;

export const ROLE_OPTIONS = [
  { value: "USER", label: "کاربر عادی" },
  { value: "ADMIN", label: "مدیر" },
];
export const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

export const ORDER_STATUS_OPTIONS = [
  { value: "PENDING", label: "در انتظار بررسی", color: "text-amber-700 bg-amber-50" },
  { value: "PROCESSING", label: "در حال آماده‌سازی", color: "text-sky-700 bg-sky-50" },
  { value: "SHIPPING", label: "در حال ارسال", color: "text-violet-700 bg-violet-50" },
  { value: "DELIVERED", label: "تحویل شده", color: "text-emerald-700 bg-emerald-50" },
  { value: "CANCELED", label: "لغو شده", color: "text-red-600 bg-red-50" },
];
export const ORDER_STATUS_VALUES = ORDER_STATUS_OPTIONS.map((s) => s.value);
// «مرجوع شده» دیگه توی فروشگاه وجود نداره؛ فقط برای سفارش‌های قدیمیِ احتمالی توی دیتابیس برچسب نگه داشته شده
export const ORDER_STATUS_META = {
  ...Object.fromEntries(ORDER_STATUS_OPTIONS.map((s) => [s.value, s])),
  RETURNED: { value: "RETURNED", label: "مرجوع شده", color: "text-slate-600 bg-slate-100" },
};

/** سفارشی که در یکی از این وضعیت‌ها باشه، کالاهاش به انبار برگشته */
export const RESTOCK_STATUSES = ["CANCELED", "RETURNED"];

// ───────────── مالی ─────────────
export const TRANSACTION_TYPE_OPTIONS = [
  { value: "PAYMENT", label: "پرداخت", color: "text-emerald-700 bg-emerald-50" },
  { value: "REFUND", label: "برگشت وجه", color: "text-orange-700 bg-orange-50" },
];
export const TRANSACTION_TYPE_META = Object.fromEntries(TRANSACTION_TYPE_OPTIONS.map((t) => [t.value, t]));
export const TRANSACTION_TYPE_VALUES = TRANSACTION_TYPE_OPTIONS.map((t) => t.value);

export const TRANSACTION_STATUS_OPTIONS = [
  { value: "PENDING", label: "در انتظار", color: "text-amber-700 bg-amber-50" },
  { value: "SUCCESS", label: "موفق", color: "text-emerald-700 bg-emerald-50" },
  { value: "FAILED", label: "ناموفق", color: "text-red-600 bg-red-50" },
];
export const TRANSACTION_STATUS_META = Object.fromEntries(TRANSACTION_STATUS_OPTIONS.map((t) => [t.value, t]));
export const TRANSACTION_STATUS_VALUES = TRANSACTION_STATUS_OPTIONS.map((t) => t.value);

export const PAYMENT_METHOD_OPTIONS = [
  { value: "ONLINE", label: "درگاه آنلاین" },
  { value: "CASH", label: "نقدی / در محل" },
  { value: "CARD_TO_CARD", label: "کارت به کارت" },
  { value: "WALLET", label: "کیف پول" },
];
export const PAYMENT_METHOD_LABELS = Object.fromEntries(PAYMENT_METHOD_OPTIONS.map((m) => [m.value, m.label]));
export const PAYMENT_METHOD_VALUES = PAYMENT_METHOD_OPTIONS.map((m) => m.value);

// ───────────── لاگ فعالیت‌ها ─────────────
export const ACTIVITY_ACTION_OPTIONS = [
  { value: "CREATE", label: "ایجاد", color: "text-emerald-700 bg-emerald-50" },
  { value: "UPDATE", label: "ویرایش", color: "text-sky-700 bg-sky-50" },
  { value: "STATUS", label: "تغییر وضعیت", color: "text-violet-700 bg-violet-50" },
  { value: "DELETE", label: "حذف", color: "text-red-600 bg-red-50" },
];
export const ACTIVITY_ACTION_META = Object.fromEntries(ACTIVITY_ACTION_OPTIONS.map((a) => [a.value, a]));
export const ACTIVITY_ACTION_VALUES = ACTIVITY_ACTION_OPTIONS.map((a) => a.value);

export const ACTIVITY_ENTITY_OPTIONS = [
  { value: "PRODUCT", label: "محصول" },
  { value: "CATEGORY", label: "دسته‌بندی" },
  { value: "BRAND", label: "برند" },
  { value: "BANNER", label: "بنر" },
  { value: "USER", label: "کاربر" },
  { value: "ORDER", label: "سفارش" },
  { value: "COURIER", label: "پیک" },
  { value: "SHIPPING_ZONE", label: "محدوده‌ی ارسال" },
  { value: "SHIPPING_SETTINGS", label: "تنظیمات ارسال" },
  { value: "STORE_STATUS", label: "وضعیت فروشگاه" },
  { value: "SITE_PALETTE", label: "پالت رنگی سایت" },
  { value: "TRANSACTION", label: "تراکنش" },
  { value: "WALLET", label: "کیف پول" },
];
export const ACTIVITY_ENTITY_LABELS = Object.fromEntries(ACTIVITY_ENTITY_OPTIONS.map((e) => [e.value, e.label]));
export const ACTIVITY_ENTITY_VALUES = ACTIVITY_ENTITY_OPTIONS.map((e) => e.value);

// ───────────── گزارش‌ها ─────────────
export const REPORT_RANGES = [
  { value: 7, label: "۷ روز اخیر" },
  { value: 30, label: "۳۰ روز اخیر" },
  { value: 90, label: "۹۰ روز اخیر" },
];
export const REPORT_DEFAULT_DAYS = 30;

/** سفارش‌هایی که در وضعیت‌های لغو/مرجوع نیستن «فروش معتبر» حساب می‌شن */
export const INVALID_SALE_STATUSES = ["CANCELED", "RETURNED"];

// ───────────── تنظیمات ارسال ─────────────
export const SHIPPING_SETTINGS_KEY = "shipping";
export const SHIPPING_SETTINGS_DEFAULTS = {
  postEnabled: true,
  courierEnabled: true,
  pickupEnabled: true,
  defaultFee: 0,
  freeShippingOver: 0, // صفر = ارسال رایگان نداریم
  tehranDeliveryTime: "۲ تا ۷ ساعت کاری",
  otherDeliveryTime: "۲ تا ۷ روز کاری",
  pickupAddress: "",
  note: "",
};

// ───────────── وضعیت فروشگاه (باز / بسته) ─────────────
export const STORE_STATUS_KEY = "store-status";
export const STORE_CLOSED_DEFAULT_MESSAGE = "فروشگاه فعلاً تعطیل است و فردا ساعت ۹ صبح باز می‌شود.";
export const STORE_STATUS_DEFAULTS = {
  open: true, // پیش‌فرض باز؛ تا وقتی ادمین نبسته، رفتار سایت عوض نمی‌شه
  closedMessage: STORE_CLOSED_DEFAULT_MESSAGE, // متنی که توی مودال به مشتری نشون داده می‌شه
};
