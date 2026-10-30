import * as React from "react";
import { cn } from "../../utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(
          "flex min-h-11 w-full rounded-xl border border-input bg-card px-3.5 py-2 text-[0.9375rem] text-foreground transition-[border-color,box-shadow] duration-150 placeholder:text-muted-foreground/80 hover:border-primary/40 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
