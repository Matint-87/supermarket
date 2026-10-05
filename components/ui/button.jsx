import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

// دکمه‌ی shadcn/ui با رنگ‌های برند سایت (green-* یعنی «رنگ برند»)
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all outline-none focus-visible:ring-4 focus-visible:ring-green-600/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-linear-to-b from-green-600 to-green-700 font-bold text-white shadow-brand hover:from-green-700 hover:to-green-800",
        // «destructive» دیگه رنگ جدا نداره (همه‌ی دکمه‌های سایت آبی برند هستن)؛ فقط برای سازگاری با کدهای قبلی مونده
        destructive:
          "bg-linear-to-b from-green-600 to-green-700 font-bold text-white shadow-brand hover:from-green-700 hover:to-green-800",
        outline:
          "border border-green-600/40 bg-white font-bold text-green-700 shadow-sm shadow-slate-900/[0.03] hover:bg-green-50",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        link: "text-green-700 underline-offset-4 hover:underline",
      },
      size: {
        // اندازه‌ی استاندارد: sm = ۳۶px (دکمه‌های جدول/فیلتر)، default = ۴۴px، lg = ۴۸px (دکمه‌ی اصلی صفحه/فرم)
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-8",
        icon: "size-9 rounded-full",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { Button };
