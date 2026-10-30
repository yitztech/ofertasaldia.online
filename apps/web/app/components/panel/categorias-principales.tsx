import { Link } from "react-router";
import { iconoCategoria } from "~/components/ofertas/iconos-categoria";
import { Card } from "~/components/ui/card";
import type { CategoriaPrincipal } from "~/datos/tipos";

export function CategoriasPrincipales({ categorias }: { categorias: CategoriaPrincipal[] }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold">Categorías principales</h2>
        <Link to="/panel" className="text-xs font-semibold text-primary">
          Ver todas
        </Link>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {categorias.map((c) => {
          const Icono = iconoCategoria[c.id];
          return (
            <li key={c.id} className="grid grid-cols-[1.75rem_5.5rem_1fr_2.5rem] items-center gap-2 text-xs">
              <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-acento text-primary">
                <Icono className="size-4" />
              </span>
              <span className="truncate font-medium">{c.nombre}</span>
              <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-marca" style={{ width: `${c.porcentaje}%` }} />
              </span>
              <span className="text-right text-muted-foreground cifras">{c.porcentaje}%</span>
              <span className="sr-only">{`${c.nombre}: ${c.porcentaje}%`}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
