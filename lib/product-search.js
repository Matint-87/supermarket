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

/** شرط Prisma: همه‌ی کلمه‌ها باید جایی توی «نام محصول»، «نام دسته‌بندی» یا «نام برند» پیدا بشن (ترتیب مهم نیست) */
export function productSearchWhere(q) {
  const terms = searchTerms(q);
  if (!terms.length) return {};
  return {
    AND: terms.map((t) => ({
      OR: variants(t).flatMap((v) => [
        { name: { contains: v, mode: "insensitive" } },
        { category: { name: { contains: v, mode: "insensitive" } } },
        { brand: { name: { contains: v, mode: "insensitive" } } },
      ]),
    })),
  };
}

// متن برای امتیازدهی: ارقام انگلیسی، ی/ک فارسی، نیم‌فاصله → فاصله، حروف کوچک
function plain(text) {
  return toEnglishDigits(normalizeText(String(text ?? "").replace(/[\u200c\u200d\u0640]/g, " "))).toLowerCase();
}

/**
 * امتیاز مرتبط‌بودن یه محصول با عبارت جست‌وجو (هرچی بیشتر، بالاتر).
 * شروع نام با عبارت > شروع یک کلمه با عبارت > وجود عبارت وسط کلمه؛ تطابق برند و موجودبودن هم امتیاز کوچیکی می‌دن.
 */
export function relevanceScore({ name, brand, stock }, q) {
  const terms = searchTerms(q).map(plain);
  if (!terms.length) return 0;
  const n = plain(name);
  const words = n.split(" ");
  const b = plain(brand);
  let score = 0;

  if (n === terms.join(" ")) score += 100; // تطابق کامل
  else if (n.startsWith(terms.join(" "))) score += 50; // نام با کل عبارت شروع می‌شه
  if (n.startsWith(terms[0])) score += 8;

  for (const t of terms) {
    if (words.includes(t)) score += 12; // کلمه‌ی کامل
    else if (words.some((w) => w.startsWith(t))) score += 10; // شروع یک کلمه
    else if (n.includes(t)) score += 4; // وسط کلمه
    if (b && b.includes(t)) score += 3;
  }

  if (stock > 0) score += 2;
  return score - n.length / 100; // اگه امتیازها مساوی بود، نام کوتاه‌تر (دقیق‌تر) جلوتره
}

/** هایلایت: عبارت جست‌وجو رو توی متن پیدا می‌کنه و تکه‌های {text, hit} برمی‌گردونه (ی/ک عربی و فارسی یکی حساب می‌شن) */
export function highlightParts(text, q) {
  const value = String(text ?? "");
  const terms = searchTerms(q);
  if (!value || !terms.length) return [{ text: value, hit: false }];

  const esc = (s) =>
    s
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/[یي]/g, "[یي]")
      .replace(/[کك]/g, "[کك]");
  const re = new RegExp(`(${terms.map(esc).join("|")})`, "gi");

  // split با گروه capture: اندیس‌های فرد همیشه تکه‌های جورشده‌ان (اول map، بعد حذف تکه‌های خالی)
  return value
    .split(re)
    .map((part, i) => ({ text: part, hit: i % 2 === 1 }))
    .filter((part) => part.text);
}
