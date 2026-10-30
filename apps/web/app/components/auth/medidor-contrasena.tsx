import { CheckIcon, CircleIcon } from "lucide-react";
import type { ReglaContrasena } from "~/lib/validacion";
import { cn } from "~/utils";

/** Barra de fortaleza (una sección por regla cumplida) y lista de requisitos. */
export function MedidorContrasena({ reglas, id }: { reglas: ReglaContrasena[]; id: string }) {
  const cumplidas = reglas.filter((r) => r.cumple).length;
  return (
    <div id={id} className="flex flex-col gap-2.5">
      <div role="progressbar" aria-label="Seguridad de la contraseña" aria-valuemin={0} aria-valuemax={reglas.length} aria-valuenow={cumplidas} className="grid grid-cols-4 gap-1.5">
        {reglas.map((r, i) => (
          <span key={r.id} className={cn("h-1 rounded-full", i < cumplidas ? "bg-marca" : "bg-border")} />
        ))}
      </div>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-xs">
        {reglas.map((r) => (
          <li key={r.id} className={cn("flex items-center gap-2", r.cumple ? "text-success" : "text-muted-foreground")}>
            {r.cumple ? (
              <CheckIcon aria-hidden="true" className="size-4" />
            ) : (
              <CircleIcon aria-hidden="true" className="size-4" />
            )}
            {r.texto}
            <span className="sr-only">{r.cumple ? " (cumplido)" : " (pendiente)"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
