"use client"
import { useEffect, useRef, useState } from "react";

// پلیس‌هولدر عکس (اگه فایل عکس پیدا نشد)
const PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>
      <rect width='200' height='200' fill='#F2EFE7'/>
      <path d='M60 140l28-36 22 26 16-18 24 28z' fill='#C8DFDB'/>
      <circle cx='78' cy='76' r='12' fill='#C8DFDB'/>
    </svg>`,
  );

export default function LazyImage({ src, alt, className = "" }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);

  // اگه عکس قبل از هیدریت شدن ری‌اکت لود شده (یا ارور داده)، onLoad/onError از دست رفته؛
  // اینجا وضعیت واقعی عکس رو چک می‌کنیم تا اسکلتون برای همیشه نمونه
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete) {
      if (el.naturalWidth === 0) setFailed(true);
      setLoaded(true);
    }
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* جای خالی ثابت (بدون انیمیشن) تا وقتی عکس لود بشه */}
      {!loaded && <div className="absolute inset-0 bg-slate-100" />}
      <img
        ref={imgRef}
        src={failed ? PLACEHOLDER : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={`h-full w-full object-contain ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}