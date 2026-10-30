import { Link } from "react-router";
import { cn } from "~/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="OfertasAlDia, inicio"
      className={cn("inline-flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl no-underline", className)}
    >
      <img src="/img/marca/logo.png" alt="" width={38} height={46} className="h-10 w-auto" />
      <span className="text-[1.65rem] font-extrabold leading-none tracking-tight text-foreground">
        Ofertas<span className="text-foreground">Al</span>
        <span className="texto-marca">Dia</span>
      </span>
    </Link>
  );
}
