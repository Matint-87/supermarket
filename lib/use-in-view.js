"use client";

import { useEffect, useRef, useState } from "react";

/**
 * هوک «وقتی نزدیک دید اومد» برای لود تنبل بخش‌ها (نمودار، قفسه‌ی محصولات و …).
 * بعد از اولین دیده‌شدن دیگه observer قطع می‌شه و `inView` همون true می‌مونه (یعنی یک‌بار لود، نه هر بار اسکرول).
 * rootMargin: چقدر قبل از رسیدن به دید لود شروع بشه.
 */
export function useInView(rootMargin = "200px") {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);

  return [ref, inView];
}
