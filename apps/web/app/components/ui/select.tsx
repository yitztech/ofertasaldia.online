import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "../../utils";

const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => {
  return (
    <span className="relative inline-flex w-full">
      <select
        ref={ref}
        data-slot="select"
        className={cn(
          "min-h-11 w-full appearance-none rounded-xl border border-input bg-card py-2 pl-3.5 pr-10 text-[0.9375rem] text-foreground transition-[border-color,box-shadow] duration-150 hover:border-primary/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </span>
  );
});
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
