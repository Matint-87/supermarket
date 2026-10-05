// منطق مشترکِ جست‌وجوی محصول (فروشگاه + پنل مدیریت). بدون import سمت‌سروری.
import { toEnglishDigits, toFaDigits } from "@/lib/phone";
import { normalizeText } from "@/lib/text";

const MAX_TERMS = 5;

/**
 * عبارت جست‌وجو → لیست کلمه‌ها.
 * نیم‌فاصله (ZWNJ) و کشیده هم جداکننده حساب می‌شن؛ پس «کم‌چرب»، «کم چرب» و «چرب کم» همه‌ی «ماست کم‌چرب» رو پیدا می‌کنن.
 */
export function searchTerms(q) {
  return normalizeText(String(q ?? "").replace(/[\u200c\u200d\u200e\u200f\u0640]/g, " "))
    .split(" ")
    .filter(Boolean)
    .slice(0, MAX_TERMS);
}

/** هر کلمه به چند شکل هم‌ارز: ارقام فارسی/انگلیسی و «ی/ک» فارسی یا عربی (چون توی دیتابیس هر دو ممکنه باشه) */
function variants(term) {
  const en = toEnglishDigits(term);
  const set = new Set([term, en, toFaDigits(en)]);
  for (const v of [...set]) set.add(v.replace(/ی/g, "ي").replace(/ک/g, "ك"));
  return [...set];
}

/** شرط Prisma: همه‌ی کلمه‌ها باید جایی توی «نام محصول» یا «نام دسته‌بندی» پیدا بشن (ترتیب مهم نیست) */
export function productSearchWhere(q) {
  const terms = searchTerms(q);
  if (!terms.length) return {};
  return {
    AND: terms.map((t) => ({
      OR: variants(t).flatMap((v) => [
        { name: { contains: v, mode: "insensitive" } },
        { category: { name: { contains: v, mode: "insensitive" } } },
      ]),
    })),
  };
}
