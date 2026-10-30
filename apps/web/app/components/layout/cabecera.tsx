import { type ReactNode, useState } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import { Link } from "react-router";
import { Logo } from "~/components/marca/logo";
import { Button } from "~/components/ui/button";
import { Buscador } from "./buscador";

const enlaces = [
  { a: "/#categorias", texto: "Categorías" },
  { a: "/#ofertas", texto: "Ofertas" },
  { a: "/#mas-vendidos", texto: "Más vendidos" },
  { a: "/#colecciones", texto: "Colecciones" },
];

interface CabeceraProps {
  /** Muestra el buscador junto al logo (no aparece en las pantallas de acceso). */
  conBuscador?: boolean;
  /** Controles de la derecha: cuenta, favoritos, avisos… */
  acciones?: ReactNode;
}

/** Cabecera común; cada página compone sus propias acciones. */
export function Cabecera({ conBuscador = true, acciones }: CabeceraProps) {
  const [abierto, setAbierto] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/90 backdrop-blur-md">
      <div className="contenedor flex min-h-16 items-center gap-3 lg:gap-6">
        <Logo />
        {conBuscador ? (
          <Buscador id="buscar-cabecera" className="hidden w-full max-w-[22rem] xl:flex" />
        ) : null}
        <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
          {enlaces.map((e) => (
            <Link
              key={e.a}
              to={e.a}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground no-underline hover:text-primary"
            >
              {e.texto}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-1.5 lg:flex">{acciones}</div>
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto lg:hidden"
          aria-expanded={abierto}
          aria-controls="menu-movil"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
        </Button>
      </div>
      {abierto ? (
        <div id="menu-movil" className="border-t border-border bg-card lg:hidden">
          <div className="contenedor flex flex-col gap-3 py-4">
            {conBuscador ? <Buscador id="buscar-movil" /> : null}
            <nav aria-label="Principal móvil" className="grid grid-cols-2 gap-1">
              {enlaces.map((e) => (
                <Link
                  key={e.a}
                  to={e.a}
                  onClick={() => setAbierto(false)}
                  className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground no-underline hover:bg-acento"
                >
                  {e.texto}
                </Link>
              ))}
            </nav>
            <div className="flex flex-wrap items-center gap-2">{acciones}</div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
