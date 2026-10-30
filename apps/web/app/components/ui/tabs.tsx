import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../utils";

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-secondary/70 p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  asChild = false,
  active = false,
  className,
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  active?: boolean;
}) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="tabs-trigger"
      data-state={active ? "active" : "inactive"}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold no-underline transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        active
          ? "bg-card text-foreground shadow-2xs border border-border"
          : "border border-transparent text-muted-foreground hover:bg-card/60 hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { TabsList, TabsTrigger };
