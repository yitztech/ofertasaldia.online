import { EllipsisIcon } from "lucide-react";
import { Link } from "react-router";
import type { Categoria, CategoriaId } from "~/datos/tipos";
import { cn } from "~/utils";
import { iconoCategoria } from "./iconos-categoria";

const base =
  "flex min-h-[4.5rem] min-w-[5.25rem] flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium no-underline transition-colors lg:min-w-0";

export function ChipsCategorias({ categorias, activa }: { categorias: Categoria[]; activa: CategoriaId }) {
  return (
    <nav aria-label="Categorías" id="categorias" className="scroll-mt-24">
      <ul className="sin-barra m-0 flex list-none gap-2 overflow-x-auto p-0 pb-1 lg:grid lg:grid-cols-14 lg:overflow-visible">
        {categorias.map((categoria) => {
          const Icono = iconoCategoria[categoria.id];
          const esActiva = categoria.id === activa;
          return (
            <li key={categoria.id} className="shrink-0 lg:shrink">
              <Link
                to={categoria.id === "todas" ? "/#ofertas" : `/?categoria=${categoria.id}#ofertas`}
                aria-current={esActiva ? "page" : undefined}
                className={cn(
                  base,
                  esActiva ? "bg-lila text-primary" : "bg-card text-foreground hover:bg-acento",
                )}
              >
                <Icono aria-hidden="true" className="size-6" />
                {categoria.nombre}
              </Link>
            </li>
          );
        })}
        <li className="shrink-0 lg:shrink">
          <button
            type="button"
            aria-disabled="true"
            title="Próximamente"
            className={cn(base, "w-full cursor-default bg-card text-foreground")}
          >
            <EllipsisIcon aria-hidden="true" className="size-6" />
            Más
          </button>
        </li>
      </ul>
    </nav>
  );
}
