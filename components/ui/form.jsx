// اجزای مشترک فرم‌ها — حالا روی shadcn/ui ساخته شدن (Button / Input / Label)
// اسم خروجی‌ها (inputCls، btnPrimary، btnSecondary، Field، Alert، Spinner) همون قبلیه؛
// پس همه‌ی فرم‌های سایت بدون تغییر از ظاهر جدید استفاده می‌کنن.
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// کلاس ورودی متنی/select بومی (هم‌ظاهر با کامپوننت <Input> از shadcn)
export const inputCls = (hasError = false) =>
  `h-12 w-full rounded-xl border bg-white px-4 text-sm shadow-sm shadow-slate-900/[0.02] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:ring-4 disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
      : "border-slate-200 focus:border-green-600 focus:ring-green-600/15"
  }`;

// کلاس دکمه‌ها از buttonVariants گرفته می‌شه تا با <Button> یکی بمونه
export const btnPrimary = cn(buttonVariants({ variant: "default", size: "lg" }), "flex w-full");
export const btnSecondary = cn(buttonVariants({ variant: "outline", size: "lg" }), "flex");

export function Field({ label, htmlFor, error, hint, required, className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <Label htmlFor={htmlFor} className="mb-1.5">
          {label}
          {required && <span className="ms-0.5 text-red-500">*</span>}
        </Label>
      )}
      {children}
      {/* خطای «هر فیلد» همون‌جا زیر فیلد می‌مونه؛ فقط پیام‌های کلی فرم/عملیات toast شدن */}
      {error ? (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

// پیام ثابت داخل صفحه (برای هشدارهایی که باید تا وقتی مشکل هست دیده بشن). پیام‌های گذرا → notify از lib/toast
export function Alert({ kind = "error", children }) {
  const styles =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : kind === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-amber-200 bg-amber-50 text-amber-800";
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`rounded-xl border px-4 py-3 text-xs leading-6 ${styles}`}>
      {children}
    </div>
  );
}

export function Spinner({ className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
