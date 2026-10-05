// استور سبد خرید — سمت کلاینت، ذخیره در localStorage (مهمان هم می‌تونه سبد بسازه؛ لاگین فقط موقع ثبت سفارش لازمه).
// از useSyncExternalStore استفاده می‌شه (components/cart/useCart.js) پس Provider لازم نداره و
// بین تب‌های مرورگر هم همگام می‌مونه. قیمت‌ها فقط «نمایشی»ان؛ قیمت واقعی موقع ثبت سفارش از دیتابیس خونده می‌شه.
import { api } from "@/lib/api-client";
import { MAX_CART_LINES, maxQuantityFor } from "@/lib/product-constants";

const KEY = "sabad:v1";
const EMPTY = [];

let items = EMPTY; // هر ردیف: { id, qty, p: اسنپ‌شات محصول }
let initialized = false;
const listeners = new Set();

/** فقط فیلدهای لازم از محصول رو نگه می‌داریم (هم برای حجم کمتر، هم برای امنیت در برابر دستکاری localStorage) */
function snapshotOf(p) {
  return {
    id: String(p.id),
    name: String(p.name ?? ""),
    imageUrl: p.imageUrl ? String(p.imageUrl) : null,
    unit: String(p.unit ?? "PIECE"),
    amount: Number(p.amount) || 1,
    price: Math.max(0, Math.round(Number(p.price) || 0)),
    discountPercent: Math.min(100, Math.max(0, Math.round(Number(p.discountPercent) || 0))),
    finalPrice: Math.max(0, Math.round(Number(p.finalPrice) || 0)),
    stock: Math.max(0, Math.round(Number(p.stock) || 0)),
  };
}

function read() {
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return EMPTY;
    const seen = new Set();
    const clean = [];
    for (const row of arr) {
      if (!row?.p?.id || seen.has(row.p.id)) continue;
      const p = snapshotOf(row.p);
      const max = maxQuantityFor(p.stock);
      const qty = Math.min(Math.max(Math.round(Number(row.qty) || 0), 0), max || 1);
      if (qty < 1) continue;
      seen.add(p.id);
      clean.push({ id: p.id, qty, p });
    }
    return clean.slice(0, MAX_CART_LINES);
  } catch {
    return EMPTY;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function commit(next) {
  items = next.length ? next : EMPTY;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // حالت خصوصی / پر بودن حافظه — سبد فقط تا بستن تب می‌مونه
  }
  emit();
}

function init() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  items = read();
  window.addEventListener("storage", (e) => {
    if (e.key === KEY || e.key === null) {
      items = read();
      emit();
    }
  });
}

export function subscribe(listener) {
  init();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  init();
  return items;
}

export function getServerSnapshot() {
  return EMPTY;
}

export function getQty(id) {
  init();
  return items.find((i) => i.id === id)?.qty ?? 0;
}

/**
 * افزودن به سبد. خروجی: { ok, reason?, qty }
 * reason: "out_of_stock" | "max_reached" | "cart_full"
 */
export function addToCart(product, qty = 1) {
  init();
  const p = snapshotOf(product);
  const max = maxQuantityFor(p.stock);
  if (max <= 0) return { ok: false, reason: "out_of_stock", qty: 0 };

  const existing = items.find((i) => i.id === p.id);
  if (!existing && items.length >= MAX_CART_LINES) return { ok: false, reason: "cart_full", qty: 0 };

  const current = existing?.qty ?? 0;
  const nextQty = Math.min(current + qty, max);
  const hitMax = current + qty > max;

  if (existing) {
    commit(items.map((i) => (i.id === p.id ? { id: p.id, qty: nextQty, p } : i)));
  } else {
    commit([...items, { id: p.id, qty: nextQty, p }]);
  }
  return { ok: !hitMax || nextQty > current, reason: hitMax ? "max_reached" : undefined, qty: nextQty };
}

export function setQty(id, qty) {
  init();
  const row = items.find((i) => i.id === id);
  if (!row) return;
  const n = Math.round(Number(qty) || 0);
  if (n <= 0) return removeFromCart(id);
  const max = maxQuantityFor(row.p.stock) || 1;
  commit(items.map((i) => (i.id === id ? { ...i, qty: Math.min(n, max) } : i)));
}

export function removeFromCart(id) {
  init();
  commit(items.filter((i) => i.id !== id));
}

export function clearCart() {
  init();
  commit(EMPTY);
}

/**
 * قیمت/موجودی سبد رو با دیتابیس هماهنگ می‌کنه (اگه قیمت عوض شده یا کالا تموم شده باشه).
 * خروجی: آرایه‌ی پیام‌های فارسی برای نمایش به کاربر.
 */
export async function syncCart() {
  init();
  if (!items.length) return [];
  const sent = items;
  const data = await api("POST", "/api/cart/validate", { ids: sent.map((i) => i.id) });
  const fresh = new Map(data.products.map((p) => [p.id, p]));
  const notices = [];

  const next = [];
  for (const row of items) {
    const f = fresh.get(row.id);
    if (!f || !f.isActive) {
      notices.push(`«${row.p.name}» دیگر عرضه نمی‌شود و از سبد حذف شد.`);
      continue;
    }
    const p = snapshotOf(f);
    const max = maxQuantityFor(p.stock);
    if (max <= 0) {
      notices.push(`«${p.name}» ناموجود شد و از سبد حذف شد.`);
      continue;
    }
    let qty = row.qty;
    if (qty > max) {
      qty = max;
      notices.push(`موجودی «${p.name}» فقط ${max.toLocaleString("fa-IR")} عدد است؛ تعداد کم شد.`);
    }
    if (p.finalPrice !== row.p.finalPrice) {
      notices.push(`قیمت «${p.name}» تغییر کرده است.`);
    }
    next.push({ id: p.id, qty, p });
  }
  // اگه وسط درخواست کاربر چیزی به سبد اضافه کرده، همون تغییرات رو از دست نده
  const addedMeanwhile = items.filter((i) => !sent.some((s) => s.id === i.id));
  commit([...next, ...addedMeanwhile]);
  return notices;
}
