import type { PlataformaId } from "~/datos/tipos";
import { cn } from "~/utils";
import { AmazonIcono, MercadoLibreIcono } from "./iconos-marca";

const nombres: Record<PlataformaId, string> = {
  amazon: "Amazon",
  mercadolibre: "Mercado Libre",
};

export function nombrePlataforma(id: PlataformaId) {
  return nombres[id];
}

export function Plataforma({ id, className }: { id: PlataformaId; className?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-xs text-foreground", className)}>
      {id === "amazon" ? (
        <AmazonIcono className="size-5 shrink-0 text-foreground" />
      ) : (
        <MercadoLibreIcono className="w-5 shrink-0" />
      )}
      <span className="truncate">{nombres[id]}</span>
    </span>
  );
}
