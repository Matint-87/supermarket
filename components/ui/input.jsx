import * as React from "react";
import { cn } from "@/lib/utils";

// ورودی متنی shadcn/ui (aria-invalid حالت خطا رو قرمز می‌کنه)
function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm shadow-slate-900/[0.02] outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-600 focus:ring-4 focus:ring-green-600/15 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 aria-invalid:border-red-400 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/15",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
