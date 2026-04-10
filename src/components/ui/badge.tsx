import * as React from "react";
import { clsx, type ClassValue } from "clsx";

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.35em]",
        variant === "default" && "border border-white/10 bg-white/5 text-zinc-300",
        variant === "secondary" && "bg-white/10 text-white",
        variant === "outline" && "border border-white/10 text-white/60",
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };
