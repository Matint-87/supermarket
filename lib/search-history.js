// تاریخچه‌ی جست‌وجوهای کاربر (فقط توی مرورگر خودش، localStorage).
// یک store کوچیک که با useSyncExternalStore وصل می‌شه؛ پس بدون ناهماهنگی hydration
// و حتی بین تب‌های مختلف همگام می‌مونه.

const KEY = "search-history:v1";
export const MAX_HISTORY = 30; // حداکثر چیزی که نگه می‌داریم
export const VISIBLE_HISTORY = 10; // چندتا اول نشون داده می‌شه؛ بقیه با «مشاهده‌ی همه»

const EMPTY = Object.freeze([]);
const listeners = new Set();
let cacheRaw;
let cacheVal = EMPTY;

// برای مقایسه: بی‌توجه به حروف، فاصله‌ی اضافه و ی/ک عربی
function keyOf(text) {
  return String(text)
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw) return cacheVal; // snapshot باید پایدار باشه، وگرنه React حلقه می‌زنه
    cacheRaw = raw;
    const arr = JSON.parse(raw || "[]");
    cacheVal = Array.isArray(arr) ? arr.filter((s) => typeof s === "string" && s.trim()).slice(0, MAX_HISTORY) : EMPTY;
  } catch {
    cacheVal = EMPTY;
  }
  return cacheVal;
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // حالت خصوصی/پرشدن حافظه: بی‌صدا رد می‌شیم
  }
  listeners.forEach((l) => l());
}

export function subscribeHistory(callback) {
  listeners.add(callback);
  const onStorage = (e) => {
    if (e.key === KEY || e.key === null) callback(); // تغییر از تب دیگه
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

export const getHistorySnapshot = read;
export const getHistoryServerSnapshot = () => EMPTY;

/** اضافه‌کردن یه جست‌وجو: اگه قبلاً بوده می‌پره اول لیست (تکراری نمی‌شه) */
export function addSearch(text) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!t) return;
  const k = keyOf(t);
  write([t, ...read().filter((s) => keyOf(s) !== k)].slice(0, MAX_HISTORY));
}

/** حذف یکی از جست‌وجوها */
export function removeSearch(text) {
  const k = keyOf(text);
  write(read().filter((s) => keyOf(s) !== k));
}

/** پاک‌کردن کل تاریخچه */
export function clearSearches() {
  write([]);
}
