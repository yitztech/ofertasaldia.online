import { SearchIcon } from "lucide-react";
import { Form } from "react-router";
import { limites } from "~/lib/limites";
import { cn } from "~/utils";

/** Buscador en forma de píldora; envía `q` a la portada. */
export function Buscador({
  className,
  valorInicial = "",
  etiqueta = "Buscar productos, marcas, categorías...",
  conBoton = false,
  id,
}: {
  className?: string;
  valorInicial?: string;
  etiqueta?: string;
  conBoton?: boolean;
  id: string;
}) {
  return (
    <Form method="get" action="/" role="search" className={cn("relative flex items-center", className)}>
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-4 size-[1.125rem] text-foreground" />
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={valorInicial}
        maxLength={limites.busqueda}
        autoComplete="off"
        placeholder={etiqueta}
        className={cn(
          "min-h-11 w-full rounded-full border border-transparent bg-muted pl-11 text-sm text-foreground placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:bg-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20",
          conBoton ? "bg-card pr-32" : "pr-4",
        )}
      />
      {conBoton ? (
        <button
          type="submit"
          className="absolute right-1.5 min-h-10 cursor-pointer rounded-full bg-marca px-8 text-sm font-semibold text-primary-foreground shadow-boton hover:brightness-110"
        >
          Buscar
        </button>
      ) : null}
    </Form>
  );
}
