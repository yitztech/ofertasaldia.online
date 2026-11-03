import { useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";
import { Form } from "react-router";
import { limites } from "~/lib/limites";
import { cn } from "~/utils";

/** Buscador en forma de píldora con sugerencias en tiempo real (<datalist>). */
export function Buscador({
  className,
  valorInicial = "",
  etiqueta = "Buscar productos, marcas, categorías...",
  conBoton = false,
  destino = "/",
  id,
}: {
  className?: string;
  valorInicial?: string;
  etiqueta?: string;
  conBoton?: boolean;
  destino?: string;
  id: string;
}) {
  const [termino, setTermino] = useState(valorInicial);
  const [sugerencias, setSugerencias] = useState<string[]>([]);
  const listId = `${id}-sugerencias`;

  useEffect(() => {
    setTermino(valorInicial);
  }, [valorInicial]);

  useEffect(() => {
    const q = termino.trim();
    if (q.length < 2) {
      setSugerencias([]);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/products/suggestions?q=${encodeURIComponent(q)}`, {
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { items?: Array<{ title: string }> } | null) => {
          if (data && Array.isArray(data.items)) {
            setSugerencias(
              Array.from(new Set(data.items.map((item) => item.title))).slice(0, 6),
            );
          }
        })
        .catch(() => {});
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [termino]);

  return (
    <Form method="get" action={destino} role="search" className={cn("relative flex items-center", className)}>
      <label htmlFor={id} className="sr-only">
        {etiqueta}
      </label>
      <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-4 size-[1.125rem] text-foreground" />
      <input
        id={id}
        name="q"
        type="search"
        list={listId}
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        maxLength={limites.busqueda}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={etiqueta}
        className={cn(
          "min-h-11 w-full rounded-full border border-transparent bg-muted pl-11 text-sm text-foreground placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:bg-card focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20",
          conBoton ? "bg-card pr-32" : "pr-4",
        )}
      />
      <datalist id={listId}>
        {sugerencias.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
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
