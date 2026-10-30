import { StarIcon, type LucideIcon } from "lucide-react";
import { iconoCategoria } from "~/components/ofertas/iconos-categoria";
import { nombrePlataforma } from "~/components/comun/plataforma";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import type { Afiliado, CategoriaId, PlataformaId, RangoPrecioId } from "~/datos/tipos";
import type { FiltrosPerfil } from "~/lib/ofertas";
import { cn } from "~/utils";

function alternar<T>(lista: T[], valor: T) {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

function CasillaConteo({ etiqueta, conteo, marcada, onCambio }: { etiqueta: string; conteo: number; marcada: boolean; onCambio: () => void }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
      <Checkbox checked={marcada} onChange={onCambio} />
      <span className="flex-1">{etiqueta}</span>
      <span className="text-xs text-muted-foreground cifras">{conteo}</span>
    </label>
  );
}

interface Props {
  afiliado: Afiliado;
  filtros: FiltrosPerfil;
  onCambiar: (siguiente: FiltrosPerfil) => void;
}

export function FiltrosDelPerfil({ afiliado, filtros, onCambiar }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4">
        <h2 className="mb-2 text-sm font-extrabold">Categorías en su perfil</h2>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {afiliado.categorias.map((c) => {
            const Icono: LucideIcon = iconoCategoria[c.id];
            const activa = filtros.categoria === c.id;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={activa}
                  onClick={() => onCambiar({ ...filtros, categoria: activa ? ("todas" as CategoriaId) : c.id })}
                  className={cn(
                    "flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg px-1.5 text-left text-sm hover:bg-acento",
                    activa && "bg-acento font-semibold text-primary",
                  )}
                >
                  <span aria-hidden="true" className="grid size-7 place-items-center rounded-lg bg-acento text-primary">
                    <Icono className="size-4" />
                  </span>
                  <span className="flex-1">{c.nombre}</span>
                  <span className="text-xs text-muted-foreground cifras">{c.productos}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => onCambiar({ ...filtros, categoria: "todas" })}
          className="mt-1 inline-flex min-h-10 cursor-pointer items-center text-sm font-medium text-primary hover:underline"
        >
          Ver todas
        </button>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-extrabold">Filtrar productos</h2>
        <fieldset className="m-0 mb-3 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-semibold">Plataforma</legend>
          {(Object.keys(afiliado.conteoPlataformas) as PlataformaId[]).map((id) => (
            <CasillaConteo
              key={id}
              etiqueta={nombrePlataforma(id)}
              conteo={afiliado.conteoPlataformas[id]}
              marcada={filtros.plataformas.includes(id)}
              onCambio={() => onCambiar({ ...filtros, plataformas: alternar(filtros.plataformas, id) })}
            />
          ))}
        </fieldset>
        <fieldset className="m-0 mb-3 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-semibold">Rango de precio</legend>
          {afiliado.conteoPrecios.map((r) => (
            <CasillaConteo
              key={r.id}
              etiqueta={r.etiqueta}
              conteo={r.productos}
              marcada={filtros.precios.includes(r.id as RangoPrecioId)}
              onCambio={() => onCambiar({ ...filtros, precios: alternar(filtros.precios, r.id) })}
            />
          ))}
        </fieldset>
        <fieldset className="m-0 border-0 p-0">
          <legend className="mb-1 p-0 text-sm font-semibold">Valoración mínima</legend>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={filtros.valoracionMinima === n}
                aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"} o más`}
                onClick={() => onCambiar({ ...filtros, valoracionMinima: filtros.valoracionMinima === n ? 0 : n })}
                className="grid size-8 cursor-pointer place-items-center rounded-md"
              >
                <StarIcon aria-hidden="true" className={cn("size-5", n <= filtros.valoracionMinima ? "fill-estrella text-estrella" : "fill-muted text-border")} />
              </button>
            ))}
            <span className="ml-1 text-xs text-muted-foreground">
              {filtros.valoracionMinima ? `${filtros.valoracionMinima} estrellas o más` : "Sin mínimo"}
            </span>
          </div>
        </fieldset>
      </Card>
    </div>
  );
}
