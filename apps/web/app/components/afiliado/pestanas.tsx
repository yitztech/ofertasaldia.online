import type { ReactNode } from "react";
import { cn } from "~/utils";

export interface Pestana {
  id: string;
  etiqueta: string;
}

/** Pestañas accesibles (rol tablist) con subrayado morado en la activa. */
export function Pestanas({
  pestanas,
  activa,
  onCambiar,
  etiqueta,
  children,
}: {
  pestanas: Pestana[];
  activa: string;
  onCambiar: (id: string) => void;
  etiqueta: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label={etiqueta} className="sin-barra flex gap-1 overflow-x-auto border-b border-border">
        {pestanas.map((p) => {
          const seleccionada = p.id === activa;
          return (
            <button
              key={p.id}
              role="tab"
              type="button"
              id={`pestana-${p.id}`}
              aria-selected={seleccionada}
              aria-controls="panel-pestana"
              tabIndex={seleccionada ? 0 : -1}
              onClick={() => onCambiar(p.id)}
              onKeyDown={(e) => {
                const i = pestanas.findIndex((x) => x.id === activa);
                if (e.key === "ArrowRight") onCambiar(pestanas[(i + 1) % pestanas.length]!.id);
                if (e.key === "ArrowLeft") onCambiar(pestanas[(i - 1 + pestanas.length) % pestanas.length]!.id);
              }}
              className={cn(
                "-mb-px min-h-11 shrink-0 cursor-pointer border-b-2 px-4 text-sm font-semibold transition-colors",
                seleccionada ? "border-primary text-primary" : "border-transparent text-foreground hover:text-primary",
              )}
            >
              {p.etiqueta}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id="panel-pestana" aria-labelledby={`pestana-${activa}`}>
        {children}
      </div>
    </div>
  );
}
