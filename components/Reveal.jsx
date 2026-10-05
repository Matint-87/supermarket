"use client";

import { useEffect, useRef, useState } from "react";

/*
  ظاهرشدن با انیمیشن هنگام اسکرول.
  نمونه:  <Reveal from="left" delay={120}>…</Reveal>

  from: از کدوم طرف وارد بشه
    "bottom" (پیش‌فرض) | "top" | "left" | "right" | "zoom" | "fade"
    (left/right همیشه سمت فیزیکی صفحه‌ان، نه start/end؛ پس توی RTL هم همون معنی رو دارن)
  delay: تأخیر به میلی‌ثانیه (برای ردیف‌شدن پشت‌سرهم آیتم‌ها)
  as: تگ HTML (div، section، li، h2 و…)

  استایل‌ها توی globals.css (بخش «انیمیشن اسکرول») هست. دو نکته:
  - بدون جاوااسکریپت یا با «کاهش حرکت» سیستم، محتوا از اول کامل دیده می‌شه.
  - فقط یک IntersectionObserver برای کل صفحه ساخته می‌شه (نه یکی برای هر آیتم).
*/

// یک observer مشترک؛ هر المان یک callback داره که یک‌بار صدا زده می‌شه
let sharedObserver = null;
const callbacks = new WeakMap();

function getObserver() {
  if (sharedObserver) return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cb = callbacks.get(entry.target);
        if (cb) cb();
        // بعد از اولین نمایش دیگه لازم نیست دنبالش باشیم
        sharedObserver.unobserve(entry.target);
        callbacks.delete(entry.target);
      }
    },
    // کمی قبل از رسیدن به پایین صفحه شروع می‌شه تا کاربر منتظر نمونه
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
  );
  return sharedObserver;
}

export default function Reveal({ as: Tag = "div", from = "bottom", delay = 0, className, style, children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // مرورگرهای خیلی قدیمی: بدون observer، محتوا رو یک‌راست نشون بده
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    const observer = getObserver();
    callbacks.set(el, () => setShown(true));
    observer.observe(el);
    return () => {
      observer.unobserve(el);
      callbacks.delete(el);
    };
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal={from}
      data-in={shown ? "true" : "false"}
      className={className}
      style={delay ? { ...style, "--reveal-delay": `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </Tag>
  );
}
