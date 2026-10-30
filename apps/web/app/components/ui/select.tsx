import * as React from "react";
import { cn } from "../../utils";

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      data-slot="select"
      className={cn(
        "flex min-h-11 w-full rounded-lg border border-input bg-card px-3.5 py-2 text-base text-foreground shadow-2xs transition-[border-color,box-shadow] duration-150 hover:border-foreground/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
