"use client";

import { useRef, useState } from "react";
import { FaTrash } from "react-icons/fa";

/**
 * ردیفی که با کشیدن به چپ یا راست حذف می‌شه (مثل پیام‌رسان‌ها).
 *  • عمودی اسکرول می‌کنه، افقی می‌کشه (touch-action: pan-y)
 *  • اگه بیشتر از ~۳۵٪ عرض یا ۹۰px کشیده بشه و رها بشه، ردیف می‌ره و onDismiss صدا زده می‌شه؛ وگرنه برمی‌گرده
 *  • بعد از کشیدن، «کلیکِ» ناخواسته روی ردیف نادیده گرفته می‌شه
 *  • disabled: وقتی حالت انتخاب فعاله
 */
export default function SwipeRow({ onDismiss, disabled = false, children }) {
  const [dx, setDx] = useState(0);
  const [animating, setAnimating] = useState(false);
  const st = useRef({ id: null, x: 0, y: 0, locked: false, moved: false, width: 0, el: null });

  function onPointerDown(e) {
    if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
    const s = st.current;
    s.id = e.pointerId;
    s.x = e.clientX;
    s.y = e.clientY;
    s.locked = false;
    s.moved = false;
    s.width = e.currentTarget.offsetWidth;
    s.el = e.currentTarget;
  }

  function onPointerMove(e) {
    const s = st.current;
    if (s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.locked) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) {
        s.id = null; // اسکرول عمودیه؛ ولش کن
        return;
      }
      if (Math.abs(mx) < 10) return;
      s.locked = true;
      s.moved = true;
      try {
        s.el.setPointerCapture(e.pointerId);
      } catch {}
    }
    setAnimating(false);
    setDx(mx);
  }

  function finish(e) {
    const s = st.current;
    if (s.id !== e.pointerId) return;
    s.id = null;
    if (!s.locked) return;
    const limit = Math.min(s.width * 0.35, 90);
    if (Math.abs(dx) >= limit) {
      const dir = dx > 0 ? 1 : -1;
      setAnimating(true);
      setDx(dir * s.width * 1.1);
      setTimeout(() => onDismiss?.(), 180);
    } else {
      setAnimating(true);
      setDx(0);
    }
  }

  return (
    <div className="relative overflow-hidden">
      {/* پس‌زمینه‌ی قرمز با سطل زباله که زیر ردیف دیده می‌شه */}
      <div aria-hidden="true" className="absolute inset-0 flex items-center justify-between bg-red-500 px-5 text-white">
        <FaTrash size={16} />
        <FaTrash size={16} />
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onClickCapture={(e) => {
          if (st.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            st.current.moved = false;
          }
        }}
        style={{
          transform: `translateX(${dx}px)`,
          transition: animating ? "transform 180ms ease-out" : "none",
          touchAction: "pan-y",
          opacity: Math.abs(dx) > 0 ? Math.max(0.35, 1 - Math.abs(dx) / (st.current.width * 1.4 || 600)) : 1,
        }}
        className="relative bg-white"
      >
        {children}
      </div>
    </div>
  );
}
