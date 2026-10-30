import { EllipsisIcon, MousePointerClickIcon } from "lucide-react";
import { Plataforma } from "~/components/comun/plataforma";
import { BotonFavorito } from "~/components/ofertas/tarjeta-oferta";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { EstadoProducto, ProductoPanel } from "~/datos/tipos";
import { formatearMxn, formatearNumero } from "~/lib/formato";

const estados: Record<EstadoProducto, { texto: string; variante: "oferta" | "pendiente" | "agotado" }> = {
  activo: { texto: "Activo", variante: "oferta" },
  pendiente: { texto: "Pendiente", variante: "pendiente" },
  "sin-stock": { texto: "Sin stock", variante: "agotado" },
};

export function TarjetaProductoPanel({ producto }: { producto: ProductoPanel }) {
  const estado = estados[producto.estado];
  return (
    <article className="relative flex h-full flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-tarjeta">
      <div className="flex h-32 items-center justify-center">
        <Badge variant={estado.variante} className="absolute left-3 top-3">
          {estado.texto}
        </Badge>
        <BotonFavorito nombre={producto.nombre} className="absolute right-2.5 top-2.5" />
        <img src={producto.imagen} alt="" loading="lazy" className="max-h-full max-w-[85%] object-contain mix-blend-multiply" />
      </div>
      <h3 className="m-0 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">{producto.nombre}</h3>
      <Plataforma id={producto.plataforma} />
      <p className="m-0 text-lg font-extrabold leading-6 text-precio cifras">{formatearMxn(producto.precioCentavos)}</p>
      <dl className="m-0 rounded-xl bg-acento/70 px-3 py-2 text-xs">
        <dt className="text-muted-foreground">Ganancia estimada</dt>
        <dd className="m-0 font-semibold cifras">
          {formatearMxn(producto.gananciaCentavos)} ({producto.comisionPorcentaje}%)
        </dd>
      </dl>
      <p className="m-0 inline-flex items-center gap-1.5 text-xs text-muted-foreground cifras">
        <MousePointerClickIcon aria-hidden="true" className="size-3.5 text-primary" />
        {formatearNumero(producto.clics)} clics
      </p>
      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button asChild variant="suave" size="sm" className="flex-1">
          <a href={producto.enlace} target="_blank" rel="sponsored noopener noreferrer">
            Ver producto
            <span className="sr-only"> {producto.nombre} (se abre en una pestaña nueva)</span>
          </a>
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Más acciones: ${producto.nombre}`} className="size-10">
          <EllipsisIcon aria-hidden="true" />
        </Button>
      </div>
    </article>
  );
}
