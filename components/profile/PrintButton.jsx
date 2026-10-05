"use client";

import { FaPrint } from "react-icons/fa";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PrintButton({ label = "چاپ فاکتور" }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={cn(buttonVariants({ size: "default" }), "flex")}
    >
      <FaPrint size={13} /> {label}
    </button>
  );
}
