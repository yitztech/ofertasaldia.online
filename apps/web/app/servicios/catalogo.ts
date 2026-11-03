import { categoriasPrincipales, carlos, clicsUltimos30Dias, coleccionesDeCarlos, conteosPanel, ofertasDeCarlos, productosPanel, resumenMes } from "~/datos/afiliado";
import { categorias } from "~/datos/categorias";
import { coleccionesPopulares, masVendidos, ofertasDestacadas } from "~/datos/marketplace";
import type { CategoriaId, Oferta, PlataformaId } from "~/datos/tipos";
import { buscarOfertas } from "~/lib/ofertas";

const API_URL = process.env.API_URL ?? "http://api:3001";

interface ApiProduct {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  platform: PlataformaId;
  priceCents: string;
  originalPriceCents?: string | null;
  discountPercentage?: number | null;
  currency: string;
  imageUrl?: string | null;
  affiliateUrl?: string | null;
  externalId?: string | null;
  rating?: number | null;
  reviewsCount?: number | null;
  status: string;
  isDemo?: boolean;
}

function transformarProducto(p: ApiProduct): Oferta {
  const precioCentavos = Number(p.priceCents);
  const precioAnteriorCentavos = p.originalPriceCents
    ? Number(p.originalPriceCents)
    : undefined;
  const descuento =
    p.discountPercentage ??
    (precioAnteriorCentavos && precioAnteriorCentavos > precioCentavos
      ? Math.round(
          ((precioAnteriorCentavos - precioCentavos) / precioAnteriorCentavos) *
            100,
        )
      : undefined);

  return {
    id: p.id,
    nombre: p.title,
    imagen: p.imageUrl || "/img/productos/freidora-oster.png",
    plataforma: p.platform,
    categoria: p.categoryId as Exclude<CategoriaId, "todas">,
    precioCentavos,
    precioAnteriorCentavos,
    descuento: descuento && descuento > 0 ? descuento : undefined,
    tono: (descuento ?? 0) >= 25 ? "descuento" : "oferta",
    valoracion: p.rating ?? 4.8,
    resenas: p.reviewsCount ?? 150,
    enlace:
      p.affiliateUrl ||
      (p.platform === "mercadolibre"
        ? "https://www.mercadolibre.com.mx"
        : "https://www.amazon.com.mx"),
  };
}

export const catalogo = {
  categorias: async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = (await res.json()) as { items: { id: string; name: string }[] };
        if (Array.isArray(data.items) && data.items.length > 0) {
          return [
            { id: "todas" as CategoriaId, nombre: "Todas las categorías" },
            ...data.items.map((c) => ({
              id: c.id as CategoriaId,
              nombre: c.name,
            })),
          ];
        }
      }
    } catch {
      // Fallback a categorías estáticas
    }
    return categorias;
  },

  ofertasDestacadas: async (
    texto: string,
    categoria: CategoriaId,
    plataforma?: PlataformaId,
  ): Promise<Oferta[]> => {
    try {
      const params = new URLSearchParams();
      if (texto) params.set("q", texto);
      if (categoria && categoria !== "todas") params.set("category", categoria);
      if (plataforma) params.set("platform", plataforma);
      params.set("limit", "50");

      const res = await fetch(`${API_URL}/api/products?${params.toString()}`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = (await res.json()) as { items: ApiProduct[] };
        if (Array.isArray(data.items) && data.items.length > 0) {
          return data.items.map(transformarProducto);
        }
      }
    } catch {
      // Fallback a ofertas demo en caso de no disponibilidad
    }
    return buscarOfertas(ofertasDestacadas, texto, categoria).filter(
      (o) => !plataforma || o.plataforma === plataforma,
    );
  },

  coleccionesPopulares: async () => coleccionesPopulares,
  masVendidos: async () => masVendidos,
};

export const afiliados = {
  porAlias: async (alias: string) =>
    alias === carlos.alias
      ? { afiliado: carlos, ofertas: ofertasDeCarlos, colecciones: coleccionesDeCarlos }
      : null,
};

export const panel = {
  afiliado: () => carlos,
  productos: () => productosPanel,
  conteos: () => conteosPanel,
  resumen: () => resumenMes,
  clics: () => clicsUltimos30Dias,
  categoriasPrincipales: () => categoriasPrincipales,
};
