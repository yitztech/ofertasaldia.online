import * as React from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "../../utils";

/** Casilla nativa (teclado y lectores de pantalla gratis) con el aspecto de marca. */
const Checkbox = React.forwardRef<HTMLInputElement, Omit<React.ComponentProps<"input">, "type">>(
  ({ className, ...props }, ref) => (
    <span className="relative inline-grid size-5 shrink-0 place-items-center">
      <input
        ref={ref}
        type="checkbox"
        data-slot="checkbox"
        className={cn(
          "peer size-5 cursor-pointer appearance-none rounded-md border border-input bg-card transition-colors checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
      <CheckIcon
        aria-hidden="true"
        strokeWidth={3}
        className="pointer-events-none absolute size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100"
      />
    </span>
  ),
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
