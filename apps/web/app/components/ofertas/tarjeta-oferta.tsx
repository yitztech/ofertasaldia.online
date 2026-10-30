import { useState } from "react";
import { ExternalLinkIcon, HeartIcon, StarIcon } from "lucide-react";
import { Plataforma } from "~/components/comun/plataforma";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { Oferta } from "~/datos/tipos";
import { formatearMxn, formatearNumero, formatearValoracion } from "~/lib/formato";
import { cn } from "~/utils";

export function InsigniaOferta({ oferta, className }: { oferta: Oferta; className?: string }) {
  if (oferta.etiqueta === "mas-vendido") {
    return (
      <Badge variant="destacado" className={className}>
        Más vendido
      </Badge>
    );
  }
  if (!oferta.descuento) return null;
  return (
    <Badge variant={oferta.tono === "oferta" ? "oferta" : "descuento"} className={className}>
      <span aria-hidden="true">-{oferta.descuento}%</span>
      <span className="sr-only">{oferta.descuento}% de descuento</span>
    </Badge>
  );
}

export function BotonFavorito({ nombre, className }: { nombre: string; className?: string }) {
  const [activo, setActivo] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={activo}
      aria-label={`${activo ? "Quitar de" : "Guardar en"} favoritos: ${nombre}`}
      onClick={() => setActivo((v) => !v)}
      className={cn(
        "inline-grid size-9 cursor-pointer place-items-center rounded-full text-foreground transition-colors hover:bg-acento hover:text-primary",
        className,
      )}
    >
      <HeartIcon aria-hidden="true" className={cn("size-[1.125rem]", activo && "fill-descuento text-descuento")} />
    </button>
  );
}

export function Valoracion({ valor, resenas }: { valor: number; resenas: number }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
      <StarIcon aria-hidden="true" className="size-3.5 fill-estrella text-estrella" />
      <span className="sr-only">Valoración {formatearValoracion(valor)} de 5, </span>
      <span className="cifras">
        {formatearValoracion(valor)} ({formatearNumero(resenas)})
      </span>
      <span className="sr-only"> reseñas</span>
    </span>
  );
}

interface TarjetaOfertaProps {
  oferta: Oferta;
  /** Color del botón: degradado de marca (marketplace) o violeta (perfil público). */
  boton?: "marca" | "violeta";
}

export function TarjetaOferta({ oferta, boton = "marca" }: TarjetaOfertaProps) {
  return (
    <article className="relative flex h-full flex-col gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-tarjeta transition-shadow hover:shadow-[0_14px_32px_-14px_rgb(110_40_170/0.32)]">
      <div className="flex h-36 items-center justify-center pt-6">
        <InsigniaOferta oferta={oferta} className="absolute left-3 top-3" />
        <BotonFavorito nombre={oferta.nombre} className="absolute right-2.5 top-2.5" />
        <img
          src={oferta.imagen}
          alt=""
          loading="lazy"
          className="max-h-full max-w-[85%] object-contain mix-blend-multiply"
        />
      </div>
      <h3 className="m-0 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">{oferta.nombre}</h3>
      <div className="flex items-center justify-between gap-2">
        <Plataforma id={oferta.plataforma} />
        <Valoracion valor={oferta.valoracion} resenas={oferta.resenas} />
      </div>
      <p className="m-0 flex flex-wrap items-baseline gap-x-2 cifras">
        <span className="text-[1.0625rem] font-extrabold leading-6 text-precio">{formatearMxn(oferta.precioCentavos)}</span>
        {oferta.precioAnteriorCentavos ? (
          <del className="text-xs text-muted-foreground">
            <span className="sr-only">Precio anterior </span>
            {formatearMxn(oferta.precioAnteriorCentavos)}
          </del>
        ) : null}
      </p>
      <Button asChild variant={boton === "violeta" ? "violeta" : "default"} size="sm" className="mt-auto w-full">
        <a href={oferta.enlace} target="_blank" rel="sponsored noopener noreferrer">
          Ver oferta
          <ExternalLinkIcon aria-hidden="true" />
          <span className="sr-only"> de {oferta.nombre} (se abre en una pestaña nueva)</span>
        </a>
      </Button>
    </article>
  );
}
