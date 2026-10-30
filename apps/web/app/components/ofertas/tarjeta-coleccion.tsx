import { ArrowRightIcon } from "lucide-react";
import { Link } from "react-router";
import type { Coleccion } from "~/datos/tipos";

export function TarjetaColeccion({ coleccion }: { coleccion: Coleccion }) {
  return (
    <article className="relative isolate flex h-28 items-end overflow-hidden rounded-xl bg-muted p-3 text-white shadow-tarjeta sm:h-32">
      <img src={coleccion.imagen} alt="" loading="lazy" className="absolute inset-0 -z-20 size-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
      <div className="min-w-0 pr-9">
        <h3 className="m-0 text-sm font-bold leading-tight sm:text-base">
          <Link to="/#ofertas" className="text-white no-underline after:absolute after:inset-0 after:content-['']">
            {coleccion.titulo}
          </Link>
        </h3>
        <p className="m-0 text-xs text-white/85">{coleccion.productos} productos</p>
      </div>
      <span aria-hidden="true" className="absolute bottom-3 right-3 grid size-7 place-items-center rounded-full bg-white/90 text-foreground">
        <ArrowRightIcon className="size-4" />
      </span>
    </article>
  );
}
