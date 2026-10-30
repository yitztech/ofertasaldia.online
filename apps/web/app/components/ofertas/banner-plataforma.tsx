import { Link } from "react-router";
import type { PlataformaId } from "~/datos/tipos";
import { cn } from "~/utils";

const contenido: Record<
  PlataformaId,
  { titulo: string; texto: string; logo: string; ancho: number; alto: number; caja: string; fondo: string }
> = {
  amazon: {
    titulo: "Ofertas en Amazon",
    texto: "Miles de productos con descuentos increíbles",
    logo: "/img/plataformas/amazon-texto.png",
    ancho: 68,
    alto: 26,
    caja: "/img/banners/amazon-caja.png",
    fondo: "bg-card",
  },
  mercadolibre: {
    titulo: "Ofertas en Mercado Libre",
    texto: "Las mejores promociones en un solo lugar",
    logo: "/img/plataformas/mercadolibre-texto.png",
    ancho: 122,
    alto: 46,
    caja: "/img/banners/mercadolibre-caja.png",
    fondo: "bg-linear-to-br from-mercadolibre via-[#ffec3d] to-[#fff3a3]",
  },
};

export function BannerPlataforma({ plataforma }: { plataforma: PlataformaId }) {
  const c = contenido[plataforma];
  return (
    <div className={cn("relative isolate flex min-h-40 overflow-hidden rounded-2xl p-4 shadow-tarjeta", c.fondo)}>
      <img
        src={c.caja}
        alt=""
        loading="lazy"
        className="absolute inset-y-0 right-0 -z-10 h-full w-[52%] object-cover object-right"
      />
      <div className="flex max-w-[52%] flex-col gap-1">
        <img src={c.logo} alt="" width={c.ancho} height={c.alto} className="mb-1 h-6 w-auto self-start mix-blend-multiply" />
        <h2 className="text-lg font-extrabold leading-tight">
          <Link
            to={`/?plataforma=${plataforma}#ofertas`}
            className="text-foreground no-underline after:absolute after:inset-0 after:content-['']"
          >
            {c.titulo}
          </Link>
        </h2>
        <p className="m-0 text-xs text-foreground/80">{c.texto}</p>
      </div>
    </div>
  );
}
