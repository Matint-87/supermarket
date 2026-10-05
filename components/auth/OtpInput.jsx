"use client";

import { useRef, useState } from "react";
import { toEnglishDigits } from "@/lib/phone";
import { OTP_LENGTH } from "@/lib/auth-constants";

/**
 * ورودی کد تأیید: یک input واقعی (شفاف) + خانه‌های نمایشی.
 * چون فقط یک input داریم، پر شدن خودکار پیامک (iOS/Android)، paste و ارقام فارسی بدون دردسر کار می‌کنن.
 */
export default function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  length = OTP_LENGTH,
  autoFocus = true,
}) {
  const ref = useRef(null);
  const [focused, setFocused] = useState(false);

  function handleChange(e) {
    const digits = toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, length);
    onChange(digits);
    if (digits.length === length) onComplete?.(digits);
  }

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="relative" dir="ltr" onClick={() => ref.current?.focus()}>
      <div className="flex justify-center gap-2" aria-hidden="true">
        {Array.from({ length }, (_, i) => {
          const isActive = focused && i === activeIndex && !disabled;
          return (
            <div
              key={i}
              className={`flex h-14 w-11 items-center justify-center rounded-xl border bg-white text-2xl font-bold transition sm:w-12 ${
                hasError
                  ? "border-red-400"
                  : isActive
                    ? "border-green-600 ring-2 ring-green-600/20"
                    : "border-slate-200"
              } ${disabled ? "opacity-60" : ""}`}
            >
              {value[i] ?? ""}
            </div>
          );
        })}
      </div>
      <input
        ref={ref}
        value={value}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="کد تأیید"
        aria-invalid={hasError}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
}
