// ابزارهای شماره موبایل و ارقام فارسی/عربی — هم سمت سرور و هم کلاینت قابل استفاده‌ست.

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** ارقام فارسی و عربی رو به انگلیسی تبدیل می‌کنه */
export function toEnglishDigits(value) {
  return String(value ?? "").replace(/[۰-۹٠-٩]/g, (d) => {
    const fa = FA_DIGITS.indexOf(d);
    return String(fa !== -1 ? fa : AR_DIGITS.indexOf(d));
  });
}

/** ارقام انگلیسی رو برای نمایش به فارسی تبدیل می‌کنه */
export function toFaDigits(value) {
  return String(value ?? "").replace(/\d/g, (d) => FA_DIGITS[d]);
}

/**
 * شماره موبایل ایران رو به شکل استاندارد 09xxxxxxxxx برمی‌گردونه.
 * ورودی‌های قابل قبول: 09123456789 ، 9123456789 ، +989123456789 ، 00989123456789 ، ۰۹۱۲...
 * اگه معتبر نباشه null برمی‌گردونه.
 */
export function normalizeMobile(input) {
  let s = toEnglishDigits(input).replace(/[\s\-()]/g, "");
  if (s.startsWith("+98")) s = s.slice(3);
  else if (s.startsWith("0098")) s = s.slice(4);
  else if (s.startsWith("98") && s.length === 12) s = s.slice(2);
  if (s.startsWith("0")) s = s.slice(1);
  return /^9\d{9}$/.test(s) ? `0${s}` : null;
}
