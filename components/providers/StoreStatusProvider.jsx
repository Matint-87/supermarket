"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FaMoon } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { STORE_CLOSED_DEFAULT_MESSAGE } from "@/lib/admin-constants";

const StoreStatusContext = createContext(null);

// هر چند ثانیه یک‌بار وضعیت فروشگاه دوباره از سرور گرفته می‌شه (علاوه بر زمانی که کاربر به تب برمی‌گرده)
const REFRESH_MS = 60_000;
// guard() اگه وضعیت کمتر از این مدت پیش گرفته شده باشه دوباره درخواست نمی‌زنه (کلیک‌های پشت‌سرهم کند نشن)
const FRESH_MS = 15_000;

/**
 * وضعیت باز/بسته‌ی فروشگاه برای کل سایت + مودال «فروشگاه تعطیل است».
 * استفاده:
 *   const { guard } = useStoreStatus();
 *   if (!(await guard())) return; // فروشگاه بسته بود → مودال نشون داده شد
 *   addToCart(...)
 * نکته: این فقط لایه‌ی نمایشیه؛ مانع اصلی ثبت سفارش توی POST /api/orders سمت سرور هست.
 */
export function StoreStatusProvider({ children }) {
  const [state, setState] = useState({ loaded: false, open: true, message: "" });
  const [dialog, setDialog] = useState(false);
  const stateRef = useRef(state);
  const checkedAt = useRef(0);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/store-status", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error("bad");
      const next = { loaded: true, open: data.open !== false, message: data.message || "" };
      checkedAt.current = Date.now();
      stateRef.current = next;
      setState(next);
      return next;
    } catch {
      // خطای شبکه: فروشگاه رو «باز» فرض می‌کنیم تا مشتری الکی قفل نشه (سرور موقع ثبت سفارش دوباره چک می‌کنه)
      return stateRef.current;
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(onVisible, REFRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [refresh]);

  /** مودال تعطیلی رو نشون می‌ده (مثلاً وقتی سرور موقع ثبت سفارش گفت فروشگاه بسته است) */
  const showClosed = useCallback((message) => {
    setState((s) => ({ ...s, loaded: true, open: false, message: message || s.message }));
    setDialog(true);
  }, []);

  /** قبل از هر کاری که نیاز به باز بودن فروشگاه داره صدا بزن؛ true = ادامه بده، false = مودال نشون داده شد */
  const guard = useCallback(async () => {
    // وضعیت تازه (اگه ادمین همین الان باز/بسته کرده باشه)؛ اگه کمتر از چند ثانیه پیش گرفتیم از همون استفاده می‌کنیم
    const fresh = stateRef.current.loaded && Date.now() - checkedAt.current < FRESH_MS;
    const current = fresh ? stateRef.current : await refresh();
    if (current.open) return true;
    setDialog(true);
    return false;
  }, [refresh]);

  const value = useMemo(() => ({ ...state, guard, showClosed, refresh }), [state, guard, showClosed, refresh]);

  return (
    <StoreStatusContext.Provider value={value}>
      {children}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader className="items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <FaMoon size={28} />
            </span>
            <DialogTitle className="mt-2">فروشگاه تعطیل است</DialogTitle>
            <DialogDescription className="text-sm leading-7">
              {state.message || STORE_CLOSED_DEFAULT_MESSAGE}
            </DialogDescription>
          </DialogHeader>
          <Button type="button" onClick={() => setDialog(false)} className="w-full">
            متوجه شدم
          </Button>
        </DialogContent>
      </Dialog>
    </StoreStatusContext.Provider>
  );
}

export function useStoreStatus() {
  const ctx = useContext(StoreStatusContext);
  if (!ctx) throw new Error("useStoreStatus باید داخل <StoreStatusProvider> استفاده بشه");
  return ctx;
}
