import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-green-50 text-green-700",
        secondary: "bg-slate-100 text-slate-600",
        success: "bg-emerald-50 text-emerald-700",
        destructive: "bg-red-50 text-red-700",
        warning: "bg-amber-50 text-amber-800",
        violet: "bg-violet-50 text-violet-700",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
