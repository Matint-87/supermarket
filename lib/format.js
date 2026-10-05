// قالب‌بندی عددها و قیمت‌ها برای نمایش (ارقام فارسی + جداکننده‌ی هزارگان)

/** ۵۷۰۰۰ → «۵۷٬۰۰۰» */
export function formatNumber(value) {
  return Number(value || 0).toLocaleString("fa-IR");
}

/** ۵۷۰۰۰ → «۵۷٬۰۰۰ تومان» */
export function formatToman(value) {
  return `${formatNumber(value)} تومان`;
}
