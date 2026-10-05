"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { FaCheck } from "react-icons/fa";
import { cn } from "@/lib/utils";

// چک‌باکس shadcn/ui — به‌جای onChange از onCheckedChange استفاده می‌شه
function Checkbox({ className, ...props }) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[18px] shrink-0 rounded-md border border-slate-300 bg-white shadow-xs outline-none transition focus-visible:ring-4 focus-visible:ring-green-600/20 disabled:cursor-not-allowed disabled:opacity-60 data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <FaCheck size={10} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
