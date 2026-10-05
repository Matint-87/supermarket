import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return <div data-slot="skeleton" className={cn("animate-pulse rounded-xl bg-slate-200/70", className)} {...props} />;
}

export { Skeleton };
