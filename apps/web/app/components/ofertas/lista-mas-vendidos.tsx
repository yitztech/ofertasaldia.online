import { Plataforma } from "~/components/comun/plataforma";
import { Badge } from "~/components/ui/badge";
import type { MasVendido } from "~/datos/tipos";
import { formatearMxn } from "~/lib/formato";

export function ListaMasVendidos({ productos }: { productos: MasVendido[] }) {
  return (
    <ol className="m-0 flex list-none flex-col gap-3 p-0">
      {productos.map((p, i) => (
        <li key={p.id} className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {i + 1}
          </span>
          <img src={p.imagen} alt="" loading="lazy" className="size-10 shrink-0 rounded-full bg-card object-contain" />
          <div className="min-w-0 flex-1">
            <p className="m-0 truncate text-xs font-medium">{p.nombre}</p>
            <Plataforma id={p.plataforma} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 cifras">
            <span className="text-sm font-extrabold">{formatearMxn(p.precioCentavos)}</span>
            <Badge variant="porcentaje">
              <span aria-hidden="true">-{p.descuento}%</span>
              <span className="sr-only">{p.descuento}% de descuento</span>
            </Badge>
          </div>
        </li>
      ))}
    </ol>
  );
}
