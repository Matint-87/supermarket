"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

function Label({ className, ...props }) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn("block text-xs font-medium text-slate-700 select-none peer-disabled:opacity-60", className)}
      {...props}
    />
  );
}

export { Label };
