import * as React from "react";
import { cn } from "../../utils";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-col items-center gap-3 rounded-2xl border border-dashed border-input bg-card px-6 py-12 text-center",
        className,
      )}
      {...props}
    />
  );
}

function EmptyIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-icon"
      className={cn(
        "grid size-12 place-items-center rounded-full bg-acento text-acento-foreground [&_svg]:size-6",
        className,
      )}
      {...props}
    />
  );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 data-slot="empty-title" className={cn("text-lg font-bold", className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn("m-0 max-w-[44ch] text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Empty, EmptyIcon, EmptyTitle, EmptyDescription };
