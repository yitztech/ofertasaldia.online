import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer no-underline select-none",
  {
    variants: {
      variant: {
        default:
          "border border-primary bg-primary text-primary-foreground shadow-2xs hover:bg-primary-hover hover:border-primary-hover",
        secondary:
          "border border-border bg-secondary/80 text-secondary-foreground shadow-2xs hover:bg-secondary hover:border-foreground/25",
        outline:
          "border border-border bg-card text-foreground shadow-2xs hover:bg-secondary/70 hover:border-foreground/30",
        ghost:
          "border border-transparent text-foreground hover:bg-secondary/80 hover:text-secondary-foreground",
        destructive:
          "border border-destructive bg-destructive text-destructive-foreground shadow-2xs hover:opacity-92",
        link: "text-primary underline-offset-4 hover:underline min-h-0 min-w-0 p-0",
      },
      size: {
        default: "min-h-11 min-w-11 px-4 py-2.5 text-[0.95rem]",
        sm: "min-h-11 px-3.5 py-2 text-xs",
        lg: "min-h-13 w-full px-6 py-3.5 text-base font-bold tracking-tight",
        icon: "min-h-11 min-w-11 p-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:shrink-0 select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-border bg-secondary text-secondary-foreground font-semibold",
        outline: "border-border bg-card text-foreground font-semibold shadow-2xs",
        discount:
          "border-transparent bg-deal text-deal-foreground font-display tabular-nums tracking-tight shadow-xs",
        verified:
          "border-border bg-secondary/90 text-muted-foreground font-medium tabular-nums",
        success: "border-success/25 bg-success/12 text-success font-semibold",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3.5 text-sm grid gap-1.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-secondary/75 text-foreground",
        success: "border-success/30 bg-success/10 text-foreground",
        warning: "border-deal/35 bg-warning-bg text-warning-fg",
        destructive: "border-destructive/35 bg-destructive/10 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
