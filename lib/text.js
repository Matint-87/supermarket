// یکسان‌سازی متن فارسی: «ي/ك» عربی → «ی/ک» فارسی، حذف فاصله‌های اضافه
// (بدون import سمت‌سروری؛ کلاینت هم می‌تونه استفاده کنه)

export function normalizeText(value) {
  return String(value ?? "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}
