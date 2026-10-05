"use client";

// ─────────── پیام‌های کاربر با react-toastify ───────────
// هر جای سایت که باید پیامی به کاربر نشون داده بشه از همین‌جا استفاده کن:
//   notify.success("ذخیره شد")   notify.error(err.message)   notify.warning("...")   notify.info("...")
// پیام تکراریِ هم‌زمان (toastId = خود متن) دوبار نمایش داده نمی‌شه.
import { useEffect } from "react";
import { toast } from "react-toastify";

const show = (type) => (message, options) => {
  if (!message) return null;
  return toast[type](message, { toastId: `${type}:${message}`, ...options });
};

export const notify = {
  success: show("success"),
  error: show("error"),
  warning: show("warning"),
  info: show("info"),
  dismiss: toast.dismiss,
};

/**
 * جایگزین <Alert>{error}</Alert>:
 * هر بار که متن پیام (state) پر بشه، یک toast نشون می‌ده. خالی کردنِ state (قبل از هر عملیات) چیزی نشون نمی‌ده.
 */
export function useToastOnChange(message, type = "error", options) {
  useEffect(() => {
    if (message) notify[type](message, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);
}
