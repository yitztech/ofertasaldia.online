import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-[background-color,border-color,color,box-shadow,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 cursor-pointer no-underline select-none",
  {
    variants: {
      variant: {
        default: "bg-marca text-primary-foreground shadow-boton hover:brightness-110",
        violeta: "bg-violeta text-primary-foreground hover:bg-violeta-hover",
        suave: "bg-acento text-acento-foreground hover:bg-lila",
        outline: "border border-input bg-card text-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-acento hover:text-acento-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:brightness-110",
        link: "min-h-0 min-w-0 p-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 min-w-11 px-5 py-2.5",
        sm: "min-h-10 px-4 py-2 text-[0.8125rem]",
        lg: "min-h-12 px-6 py-3 text-[0.9375rem]",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold leading-5 tabular-nums select-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-acento text-acento-foreground",
        outline: "border border-input bg-card text-foreground",
        descuento: "bg-descuento text-descuento-foreground",
        oferta: "bg-success text-success-foreground",
        destacado: "bg-warning/30 text-warning-foreground",
        pendiente: "bg-warning text-warning-foreground",
        agotado: "bg-descuento text-descuento-foreground",
        porcentaje: "rounded-md bg-success/12 text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export const alertVariants = cva(
  "relative grid w-full gap-1 rounded-xl border px-4 py-3.5 text-sm [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-border bg-acento/60 text-foreground",
        success: "border-success/30 bg-success/10 text-foreground",
        warning: "border-warning/50 bg-warning/15 text-foreground",
        destructive: "border-destructive/35 bg-destructive/10 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
