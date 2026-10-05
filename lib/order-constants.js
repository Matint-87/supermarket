// ثابت‌های لغو سفارش و پرداخت — بدون import سمت‌سروری، پس هم کلاینت و هم سرور می‌تونن استفاده کنن.

export const OTHER_REASON = "سایر";

/** دلیل‌های لغو برای مشتری */
export const USER_CANCEL_REASONS = [
  "اشتباه در انتخاب کالاها",
  "تغییر آدرس یا روش ارسال",
  "قیمت مناسب‌تری پیدا کردم",
  "زمان تحویل برایم مناسب نیست",
  "از خرید منصرف شدم",
  OTHER_REASON,
];

/** دلیل‌های لغو برای مدیر */
export const ADMIN_CANCEL_REASONS = [
  "ناموجود شدن کالا",
  "درخواست مشتری",
  "عدم دسترسی به مشتری",
  "آدرس خارج از محدوده‌ی ارسال",
  "مشکل در پرداخت",
  OTHER_REASON,
];

/** «دلیل انتخابی» + «توضیح» → متن نهایی که ذخیره می‌شه */
export function buildCancelReason(selected, note) {
  const n = String(note ?? "").trim();
  if (!selected) return n;
  if (selected === OTHER_REASON) return n ? `${OTHER_REASON}: ${n}` : "";
  return n ? `${selected} — ${n}` : selected;
}

export const CANCEL_REASON_MIN = 3;
export const CANCEL_REASON_MAX = 300;

/** وضعیت‌هایی که مشتری هنوز می‌تونه خودش لغو کنه (قبل از شروع آماده‌سازی) */
export const USER_CANCELABLE_STATUSES = ["PENDING"];

/** وضعیت‌هایی که پرداخت بابتشون معنی نداره */
export const NOT_PAYABLE_STATUSES = ["CANCELED", "RETURNED"];

export const WALLET_REASON_LABELS = {
  ORDER_PAYMENT: "پرداخت سفارش",
  ORDER_REFUND: "برگشت وجه سفارش",
  ADMIN_ADJUST: "اصلاح توسط مدیر",
};

/** وضعیت پرداخت یک سفارش از روی مبلغ‌ها */
export function paymentStatusOf(order, money) {
  if (money.paidSuccess === 0 && money.paidPending === 0) return "UNPAID";
  const remaining = Math.max(0, order.payable - money.paidSuccess);
  if (remaining === 0) return "PAID";
  if (money.paidSuccess === 0) return "PENDING";
  return "PARTIAL";
}

export const PAYMENT_STATUS_META = {
  UNPAID: { label: "پرداخت‌نشده", color: "text-rose-700 bg-rose-50" },
  PENDING: { label: "در انتظار تأیید پرداخت", color: "text-amber-700 bg-amber-50" },
  PARTIAL: { label: "پرداخت ناقص", color: "text-amber-700 bg-amber-50" },
  PAID: { label: "پرداخت‌شده", color: "text-emerald-700 bg-emerald-50" },
};

// ───────────── رهگیری و تحویل ─────────────

/**
 * اگه سفارشی بیشتر از این مدت (ساعت) «در حال ارسال» بمونه و مدیر تحویلش رو ثبت نکنه، خودکار «تحویل‌شده» می‌شه.
 * (با پست چند روز طول می‌کشه؛ پیک معمولاً همون روز.) null = تأیید خودکار نداریم.
 * برای عوض‌کردن مدت‌ها فقط همین‌جا رو ویرایش کن.
 */
export const AUTO_DELIVER_AFTER_HOURS = { POST: 24 * 10, COURIER: 24, PICKUP: null };

/** لینک رهگیری پست جمهوری اسلامی ایران */
export function postTrackingUrl(code) {
  return `https://tracking.post.ir/?id=${encodeURIComponent(code)}`;
}
