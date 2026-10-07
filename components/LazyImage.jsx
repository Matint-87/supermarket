"use client"
import { useEffect, useRef, useState } from "react";
import { FaImage } from "react-icons/fa";

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
      {/* اگه فایل عکس پیدا نشد: پلیس‌هولدر با رنگ‌های تم (توی تاریک و پالت‌های دیگه هم هماهنگ می‌مونه) */}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-green-300">
          <FaImage className="h-1/3 w-1/3" />
        </div>
      )}
      <img
        ref={imgRef}
        src={failed ? undefined : src}
        alt={alt}
        loading="lazy"
        decoding="async"
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={`h-full w-full object-contain ${loaded && !failed ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}