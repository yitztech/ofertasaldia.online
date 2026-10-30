import * as React from "react";
import { cn } from "../../utils";

function Avatar({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar"
      className={cn(
        "inline-grid size-7 shrink-0 place-items-center rounded-full border border-border bg-secondary font-display text-xs font-bold text-foreground select-none",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar };
