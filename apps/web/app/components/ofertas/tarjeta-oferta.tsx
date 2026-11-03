import { useEffect, useState } from "react";
import { ExternalLinkIcon, HeartIcon, StarIcon, TicketPercentIcon } from "lucide-react";
import { Link } from "react-router";
import { Plataforma } from "~/components/comun/plataforma";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import type { Oferta } from "~/datos/tipos";
import { formatearMxn, formatearNumero, formatearValoracion } from "~/lib/formato";
import { urlOferta } from "~/lib/slug";
import { cn } from "~/utils";

const UUID_CHECK = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_KEY = "oad_favoritos";

function leerFavoritosLocal(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function guardarFavoritosLocal(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // Ignorar errores de almacenamiento privado
  }
}

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

export function BotonFavorito({
  productoId,
  nombre,
  inicialFavorito = false,
  className,
}: {
  productoId?: string;
  nombre: string;
  inicialFavorito?: boolean;
  className?: string;
}) {
  const [activo, setActivo] = useState(inicialFavorito);

  useEffect(() => {
    if (!productoId) return;
    if (inicialFavorito) {
      setActivo(true);
      return;
    }
    const guardados = leerFavoritosLocal();
    if (guardados.has(productoId)) {
      setActivo(true);
    }
  }, [productoId, inicialFavorito]);

  const alternar = () => {
    const siguiente = !activo;
    setActivo(siguiente);
    if (productoId) {
      const guardados = leerFavoritosLocal();
      if (siguiente) guardados.add(productoId);
      else guardados.delete(productoId);
      guardarFavoritosLocal(guardados);

      if (UUID_CHECK.test(productoId)) {
        void fetch(`/api/favorites/${encodeURIComponent(productoId)}`, {
          method: siguiente ? "POST" : "DELETE",
          headers: { "x-csrf": "1" },
        }).catch(() => {});
      }
    }
  };

  return (
    <button
      type="button"
      aria-pressed={activo}
      aria-label={`${activo ? "Quitar de" : "Guardar en"} favoritos: ${nombre}`}
      onClick={alternar}
      className={cn(
        "inline-grid size-11 cursor-pointer place-items-center rounded-full text-foreground transition-colors hover:bg-acento hover:text-primary",
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
  /** Alias del creador cuando se muestra dentro de /c/:alias para enlazar a /c/:alias/:slugId. */
  alias?: string;
  /** Si el producto ya está guardado en favoritos del usuario autenticado. */
  inicialFavorito?: boolean;
}

export function TarjetaOferta({
  oferta,
  boton = "marca",
  alias,
  inicialFavorito = false,
}: TarjetaOfertaProps) {
  const rutaFicha = urlOferta(oferta, alias);
  return (
    <article className="relative flex h-full flex-col gap-2.5 rounded-2xl border border-border bg-card p-3 shadow-tarjeta transition-shadow hover:shadow-[0_14px_32px_-14px_rgb(110_40_170/0.32)]">
      <div className="flex h-36 items-center justify-center pt-6">
        <InsigniaOferta oferta={oferta} className="absolute left-3 top-3" />
        <BotonFavorito
          productoId={oferta.id}
          nombre={oferta.nombre}
          inicialFavorito={inicialFavorito}
          className="absolute right-1.5 top-1.5"
        />
        <Link to={rutaFicha} tabIndex={-1} aria-hidden="true" className="flex h-full w-full items-center justify-center">
          <img
            src={oferta.imagen}
            alt=""
            loading="lazy"
            className="max-h-full max-w-[85%] object-contain mix-blend-multiply"
          />
        </Link>
      </div>
      <h3 className="m-0 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-5">
        <Link to={rutaFicha} className="text-foreground no-underline hover:text-primary">
          {oferta.nombre}
        </Link>
      </h3>
      <div className="flex items-center justify-between gap-2">
        <Plataforma id={oferta.plataforma} />
        <Valoracion valor={oferta.valoracion} resenas={oferta.resenas} />
      </div>
      <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 cifras">
        <span className="text-[1.0625rem] font-extrabold leading-6 text-precio">{formatearMxn(oferta.precioCentavos)}</span>
        {oferta.precioAnteriorCentavos ? (
          <del className="text-xs text-muted-foreground">
            <span className="sr-only">Precio anterior </span>
            {formatearMxn(oferta.precioAnteriorCentavos)}
          </del>
        ) : null}
        {oferta.cuponCodigo ? (
          <span
            title={oferta.cuponDescripcion || `Cupón disponible: ${oferta.cuponCodigo}`}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-primary/40 bg-acento px-1.5 py-0.5 text-xs font-bold tracking-tight text-primary"
          >
            <TicketPercentIcon aria-hidden="true" className="size-3" />
            <span>{oferta.cuponCodigo}</span>
          </span>
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
