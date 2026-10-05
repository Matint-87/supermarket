// تابع کمکی shadcn/ui: ترکیب کلاس‌های Tailwind بدون تداخل (cn)
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
