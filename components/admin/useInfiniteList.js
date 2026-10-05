// هوک لود تنبل لیست‌های پنل مدیریت: صفحه‌ی اول رو سرور رندر کرده (initial)،
// بقیه‌ی آیتم‌ها ۱۰تا۱۰تا با رسیدن اسکرول به «سنسور» انتهای لیست از API گرفته می‌شن.
//
// نکته‌ی مهم: وقتی فیلترها عوض می‌شن صفحه‌ی سرور دوباره رندر می‌شه و والد باید یک `key` جدید بده
// تا این هوک از صفر (با initial جدید) ساخته بشه؛ اینطوری پاسخ‌های کهنه هیچ‌وقت وارد لیست جدید نمی‌شن.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";

/** آبجکت فیلترها → query string (مقدارهای خالی حذف می‌شن) */
function toQuery(filters, extra = {}) {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra })) {
    if (value !== undefined && value !== null && value !== "") sp.set(key, String(value));
  }
  return sp.toString();
}

/**
 * @param {string} endpoint   مسیر API، مثلاً "/api/admin/users"
 * @param {string} itemsKey   نام کلید آرایه توی پاسخ API، مثلاً "users"
 * @param {object} filters    فیلترهای فعلی (q, status, ...)
 * @param {{items: any[], nextCursor: string|null, total: number}} initial  صفحه‌ی اولِ رندرشده توی سرور
 */
export function useInfiniteList({ endpoint, itemsKey, filters = {}, initial }) {
  const [items, setItems] = useState(initial.items);
  const [total, setTotal] = useState(initial.total ?? initial.items.length);
  const [cursor, setCursor] = useState(initial.nextCursor ?? null); // null یعنی همه‌چیز لود شده
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sentinelRef = useRef(null);
  const busyRef = useRef(false);
  const genRef = useRef(0); // «نسل» لیست؛ بعد از reload پاسخ‌های درخواست‌های قبلی نادیده گرفته می‌شن
  const filterQs = toQuery(filters);

  const loadMore = useCallback(async () => {
    if (busyRef.current || !cursor) return;
    busyRef.current = true;
    const gen = genRef.current;
    setLoading(true);
    setError("");
    try {
      const qs = filterQs ? `${filterQs}&cursor=${cursor}` : `cursor=${cursor}`;
      const data = await api("GET", `${endpoint}?${qs}`);
      if (gen !== genRef.current) return;
      setItems((prev) => {
        // اگه بین دو درخواست رکوردی اضافه/حذف شده باشه، تکراری‌ها وارد لیست نشن
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data[itemsKey].filter((i) => !seen.has(i.id))];
      });
      setCursor(data.nextCursor ?? null);
    } catch (err) {
      if (gen === genRef.current) setError(err.message || "دریافت اطلاعات با خطا مواجه شد");
    } finally {
      if (gen === genRef.current) {
        busyRef.current = false;
        setLoading(false);
      }
    }
  }, [cursor, endpoint, filterQs, itemsKey]);

  /** لیست رو از اول (۱۰ آیتم اول) دوباره می‌گیره؛ بعد از افزودن آیتم جدید یا تغییری که ترتیب رو عوض می‌کنه */
  const reload = useCallback(async () => {
    const gen = ++genRef.current;
    busyRef.current = true;
    setLoading(true);
    setError("");
    try {
      const data = await api("GET", `${endpoint}${filterQs ? `?${filterQs}` : ""}`);
      if (gen !== genRef.current) return;
      setItems(data[itemsKey]);
      setTotal(data.total ?? data[itemsKey].length);
      setCursor(data.nextCursor ?? null);
    } catch (err) {
      if (gen === genRef.current) setError(err.message || "دریافت اطلاعات با خطا مواجه شد");
    } finally {
      if (gen === genRef.current) {
        busyRef.current = false;
        setLoading(false);
      }
    }
  }, [endpoint, filterQs, itemsKey]);

  // رسیدن اسکرول به انتهای لیست → ۱۰ تای بعدی
  // (items.length توی وابستگی‌هاست تا بعد از هر دسته، سنسور دوباره چک بشه؛ اگه هنوز توی دید بود، دسته‌ی بعدی هم لود می‌شه)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor || error) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, error, items.length, loadMore]);

  /** ویرایش آیتم داخل لیست (بدون درخواست دوباره) */
  const patchItem = useCallback((id, partial) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...partial } : i)));
  }, []);

  /** حذف آیتم از لیست */
  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  return {
    items,
    total,
    hasMore: Boolean(cursor),
    loading,
    error,
    sentinelRef,
    loadMore,
    reload,
    patchItem,
    removeItem,
  };
}
