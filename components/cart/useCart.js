"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getQty, getServerSnapshot, getSnapshot, subscribe } from "@/lib/cart-store";

const noopSubscribe = () => () => {};

/** آیا روی کلاینت هیدریت شدیم؟ (تا قبل از اون سبد «خالی» نشون داده نشه و پرش نداشته باشیم) */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** ردیف‌های سبد + جمع‌ها */
export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useIsClient();

  return useMemo(() => {
    let count = 0;
    let itemsTotal = 0;
    let payable = 0;
    for (const { qty, p } of items) {
      count += qty;
      itemsTotal += p.price * qty;
      payable += p.finalPrice * qty;
    }
    return { items, ready, count, lines: items.length, itemsTotal, payable, discount: itemsTotal - payable };
  }, [items, ready]);
}

/** تعداد یک کالا توی سبد (برای دکمه‌ی + / ۱ / − روی کارت محصول) */
export function useCartQty(id) {
  return useSyncExternalStore(subscribe, () => getQty(id), () => 0);
}
