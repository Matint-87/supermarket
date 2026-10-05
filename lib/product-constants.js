// ثابت‌های محصول — بدون import سمت‌سروری، پس هم در کلاینت و هم در سرور قابل استفاده‌ست.

export const PRODUCT_UNITS = [
  { value: "PIECE", label: "عدد" },
  { value: "BOX", label: "بسته" },
  { value: "KILOGRAM", label: "کیلوگرم" },
  { value: "GRAM", label: "گرم" },
  { value: "MESGHAL", label: "مثقال" },
  { value: "LITER", label: "لیتر" },
  { value: "CARTON", label: "باکس" }, // (اسم enum قبلاً ساخته شده؛ برچسب فارسی‌اش «باکس» است)
  { value: "TRAY", label: "شانه" }, // مثلاً شانه‌ی تخم‌مرغ
  { value: "CAN", label: "حلب" }, // مثلاً حلب روغن
  { value: "CASE", label: "کارتن" },
];

export const UNIT_LABELS = Object.fromEntries(PRODUCT_UNITS.map((u) => [u.value, u.label]));

/** تعداد محصولی که هر بار توی صفحه‌ی محصولات لود می‌شه (لود بیشتر با اسکرول) */
export const PRODUCTS_PAGE_SIZE = 20;

/** برچسب «۸۰ گرم» / «۲ عدد» از روی amount و unit محصول */
export function formatUnitAmount(amount, unit) {
  const n = Number(amount);
  const value = Number.isInteger(n) ? n : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${value} ${UNIT_LABELS[unit] ?? ""}`.trim();
}

/** حداکثر تعداد از یک کالا در هر سفارش */
export const MAX_QTY_PER_ITEM = 20;
/** حداکثر تعداد ردیف‌های مختلف توی سبد */
export const MAX_CART_LINES = 50;

/** قیمت نهایی بعد از تخفیف (تومان) — هم برای نمایش، هم برای ثبت سفارش سمت سرور استفاده می‌شه */
export function finalPriceOf(price, discountPercent) {
  return discountPercent > 0 ? Math.round((price * (100 - discountPercent)) / 100) : price;
}

/** بیشترین تعدادی که کاربر می‌تونه از این کالا بخره (کمینه‌ی موجودی و سقف هر ردیف) */
export function maxQuantityFor(stock) {
  return Math.max(0, Math.min(Number(stock) || 0, MAX_QTY_PER_ITEM));
}
