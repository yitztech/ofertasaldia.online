import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function Cabecera() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="contenedor flex min-h-16 items-center justify-between gap-4">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2.5 rounded-lg font-display text-xl font-extrabold tracking-tight text-foreground no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src="/favicon.svg" alt="" width={32} height={32} />
          OfertasAlDía
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          <Button variant="ghost" asChild>
            <a href="/#tematicas">Temáticas</a>
          </Button>
          <Button variant="ghost" asChild>
            <a href="/#ofertas">Ofertas</a>
          </Button>
        </nav>
      </div>
    </header>
  );
}
