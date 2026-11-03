import { categoriasPrincipales, carlos, clicsUltimos30Dias, coleccionesDeCarlos, conteosPanel, ofertasDeCarlos, productosPanel, resumenMes } from "~/datos/afiliado";
import { categorias } from "~/datos/categorias";
import { coleccionesPopulares, masVendidos, ofertasDestacadas } from "~/datos/marketplace";
import type { Afiliado, CategoriaId, Coleccion, Oferta, PlataformaId, RangoPrecioId } from "~/datos/tipos";
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

function transformarProducto(
  p: ApiProduct,
  origen: string = "portada",
  creador?: string,
): Oferta {
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

  const query = new URLSearchParams();
  if (origen) query.set("o", origen);
  if (creador) query.set("c", creador);
  const qStr = query.toString();
  const enlace = `/ir/${p.id}${qStr ? `?${qStr}` : ""}`;

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
    enlace,
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
          return data.items.map((p) => transformarProducto(p, "portada"));
        }
      }
    } catch {
      // Fallback a ofertas demo en caso de no disponibilidad
    }
    return buscarOfertas(ofertasDestacadas, texto, categoria)
      .filter((o) => !plataforma || o.plataforma === plataforma)
      .map((o) => ({ ...o, enlace: `/ir/${o.id}?o=portada` }));
  },

  coleccionesPopulares: async () => coleccionesPopulares,
  masVendidos: async () => masVendidos,
};

interface ApiPublicProfile {
  profile: {
    alias: string;
    nombre: string;
    avatar: string;
    coverUrl?: string | null;
    verificado: boolean;
    descripcion: string;
    redes: Array<{ red: "youtube" | "instagram" | "tiktok" | "enlace"; url: string }>;
    ubicacion: string;
    miembroDesde: string;
    estadisticas: {
      seguidores: string;
      productos: number;
      colecciones: number;
      valoracion: number;
    };
    categorias: Array<{ id: CategoriaId; nombre: string; productos: number }>;
    conteoPlataformas: Record<PlataformaId, number>;
    conteoPrecios: Array<{ id: RangoPrecioId; etiqueta: string; productos: number }>;
    accentColor?: string;
  };
  products: ApiProduct[];
  collections: Coleccion[];
}

export const afiliados = {
  porAlias: async (
    alias: string,
  ): Promise<{
    afiliado: Afiliado;
    ofertas: Oferta[];
    colecciones: Coleccion[];
  } | null> => {
    try {
      const res = await fetch(
        `${API_URL}/api/profiles/${encodeURIComponent(alias)}`,
        { signal: AbortSignal.timeout(3000) },
      );
      if (res.status === 404) {
        if (alias === carlos.alias) {
          return {
            afiliado: carlos,
            ofertas: ofertasDeCarlos,
            colecciones: coleccionesDeCarlos,
          };
        }
        return null;
      }
      if (res.ok) {
        const data = (await res.json()) as ApiPublicProfile;
        if (data && data.profile) {
          const af: Afiliado = {
            alias: data.profile.alias,
            nombre: data.profile.nombre,
            avatar: data.profile.avatar || "/img/afiliado/carlos.png",
            verificado: data.profile.verificado,
            descripcion: data.profile.descripcion,
            redes: Array.isArray(data.profile.redes)
              ? data.profile.redes.filter(
                  (r) =>
                    r.red === "youtube" ||
                    r.red === "instagram" ||
                    r.red === "tiktok" ||
                    r.red === "enlace",
                )
              : [],
            ubicacion: data.profile.ubicacion,
            miembroDesde: data.profile.miembroDesde,
            estadisticas: data.profile.estadisticas || {
              seguidores: "1.2K",
              productos: data.products?.length || 0,
              colecciones: 4,
              valoracion: 4.8,
            },
            categorias: data.profile.categorias || [],
            conteoPlataformas: data.profile.conteoPlataformas || {
              amazon: 0,
              mercadolibre: 0,
            },
            conteoPrecios: data.profile.conteoPrecios || [],
          };
          const ofertas =
            Array.isArray(data.products) && data.products.length > 0
              ? data.products.map((p) =>
                  transformarProducto(p, "pagina", data.profile.alias),
                )
              : ofertasDeCarlos.map((o) => ({
                  ...o,
                  enlace: `/ir/${o.id}?c=${encodeURIComponent(data.profile.alias)}&o=pagina`,
                }));
          const colecciones =
            Array.isArray(data.collections) && data.collections.length > 0
              ? data.collections
              : coleccionesDeCarlos;
          return { afiliado: af, ofertas, colecciones };
        }
      }
    } catch {
      // Fallback a demo en caso de no disponibilidad
    }

    if (alias === carlos.alias) {
      return {
        afiliado: carlos,
        ofertas: ofertasDeCarlos.map((o) => ({
          ...o,
          enlace: `/ir/${o.id}?c=${encodeURIComponent(carlos.alias)}&o=pagina`,
        })),
        colecciones: coleccionesDeCarlos,
      };
    }
    return null;
  },
};

export const panel = {
  afiliado: () => carlos,
  productos: () => productosPanel,
  conteos: () => conteosPanel,
  resumen: () => resumenMes,
  clics: () => clicsUltimos30Dias,
  categoriasPrincipales: () => categoriasPrincipales,
};
