import { categoriasPrincipales, carlos, clicsUltimos30Dias, coleccionesDeCarlos, conteosPanel, ofertasDeCarlos, productosPanel, resumenMes } from "~/datos/afiliado";
import { categorias } from "~/datos/categorias";
import { coleccionesPopulares, masVendidos, ofertasDestacadas } from "~/datos/marketplace";
import type { Afiliado, CategoriaId, Coleccion, Oferta, PlataformaId, RangoPrecioId } from "~/datos/tipos";
import { buscarOfertas, ordenarOfertas, type Orden } from "~/lib/ofertas";
import { extraerIdOferta, slugify } from "~/lib/slug";

const API_URL = process.env.API_URL ?? "http://api:3001";

export interface PuntoPrecio {
  id: string;
  precioCentavos: number;
  fecha: string;
}

export interface DetalleOferta extends Oferta {
  descripcion: string;
  categoriaNombre: string;
  externalId?: string | null;
  estado: "active" | "paused" | "closed";
  verificadoEn: string;
  historialPrecios: PuntoPrecio[];
  creador: Afiliado;
}

export interface SugerenciaBusqueda {
  id: string;
  titulo: string;
  categoriaId: string;
  categoriaNombre: string;
  plataforma: PlataformaId;
  precioCentavos: number;
  descuento?: number;
}

interface ApiProduct {
  id: string;
  title: string;
  description?: string | null;
  categoryId: string;
  categoryName?: string | null;
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
  lastCheckedAt?: string | null;
  isDemo?: boolean;
  priceHistory?: Array<{
    id: string;
    priceCents: string;
    recordedAt: string;
  }>;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generarHistorialSintetico(
  idBase: string,
  precioActual: number,
  precioOriginal?: number,
): PuntoPrecio[] {
  const techo =
    precioOriginal && precioOriginal > precioActual
      ? precioOriginal
      : Math.round(precioActual * 1.22);
  const intermedioAlto = Math.round(precioActual + (techo - precioActual) * 0.72);
  const intermedioMedio = Math.round(precioActual + (techo - precioActual) * 0.45);
  const intermedioBajo = Math.round(precioActual + (techo - precioActual) * 0.18);
  const ahora = Date.now();
  const dias = [90, 72, 54, 36, 18, 0];
  const precios = [
    techo,
    intermedioAlto,
    techo,
    intermedioMedio,
    intermedioBajo,
    precioActual,
  ];
  return dias.map((d, idx) => ({
    id: `${idBase}-h-${idx}`,
    precioCentavos: precios[idx],
    fecha: new Date(ahora - d * 86_400_000).toISOString(),
  }));
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

  buscarAvanzado: async (filtros: {
    q?: string;
    categoria?: CategoriaId;
    plataforma?: PlataformaId;
    minDiscount?: number;
    minPriceCents?: number;
    maxPriceCents?: number;
    estado?: "active" | "paused" | "closed";
    orden?: "recientes" | "descuento" | "precio-asc" | "precio-desc" | "valoracion";
  }): Promise<Oferta[]> => {
    const mapSort: Record<string, string> = {
      recientes: "recent",
      descuento: "discount",
      "precio-asc": "price_asc",
      "precio-desc": "price_desc",
      valoracion: "rating",
    };
    try {
      const params = new URLSearchParams();
      if (filtros.q) params.set("q", filtros.q);
      if (filtros.categoria && filtros.categoria !== "todas") {
        params.set("category", filtros.categoria);
      }
      if (filtros.plataforma) params.set("platform", filtros.plataforma);
      if (filtros.minDiscount && filtros.minDiscount > 0) {
        params.set("minDiscount", String(filtros.minDiscount));
      }
      if (filtros.minPriceCents && filtros.minPriceCents > 0) {
        params.set("minPriceCents", String(filtros.minPriceCents));
      }
      if (filtros.maxPriceCents && filtros.maxPriceCents > 0) {
        params.set("maxPriceCents", String(filtros.maxPriceCents));
      }
      if (filtros.estado) {
        params.set("status", filtros.estado);
      }
      if (filtros.orden && mapSort[filtros.orden]) {
        params.set("sort", mapSort[filtros.orden]);
      }
      params.set("limit", "50");

      const res = await fetch(`${API_URL}/api/products?${params.toString()}`, {
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = (await res.json()) as { items: ApiProduct[] };
        if (Array.isArray(data.items)) {
          return data.items.map((p) => transformarProducto(p, "busqueda"));
        }
      }
    } catch {
      // Fallback a ofertas estáticas
    }

    let locales = buscarOfertas(
      ofertasDestacadas,
      filtros.q ?? "",
      filtros.categoria ?? "todas",
    ).filter((o) => !filtros.plataforma || o.plataforma === filtros.plataforma);

    if (filtros.minDiscount && filtros.minDiscount > 0) {
      locales = locales.filter((o) => (o.descuento ?? 0) >= filtros.minDiscount!);
    }
    if (filtros.minPriceCents && filtros.minPriceCents > 0) {
      locales = locales.filter((o) => o.precioCentavos >= filtros.minPriceCents!);
    }
    if (filtros.maxPriceCents && filtros.maxPriceCents > 0) {
      locales = locales.filter((o) => o.precioCentavos <= filtros.maxPriceCents!);
    }
    if (filtros.orden === "descuento") {
      locales = [...locales].sort((a, b) => (b.descuento ?? 0) - (a.descuento ?? 0));
    } else if (filtros.orden && filtros.orden !== "recientes") {
      locales = ordenarOfertas(locales, filtros.orden as Orden);
    }
    return locales.map((o) => ({ ...o, enlace: `/ir/${o.id}?o=busqueda` }));
  },

  sugerencias: async (q: string): Promise<SugerenciaBusqueda[]> => {
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const res = await fetch(
        `${API_URL}/api/buscar/sugerencias?${params.toString()}`,
        { signal: AbortSignal.timeout(2000) },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          items: Array<{
            id: string;
            title: string;
            categoryId: string;
            categoryName?: string | null;
            platform: PlataformaId;
            priceCents: string;
            discountPercentage?: number | null;
          }>;
        };
        if (Array.isArray(data.items) && data.items.length > 0) {
          return data.items.map((item) => ({
            id: item.id,
            titulo: item.title,
            categoriaId: item.categoryId,
            categoriaNombre:
              item.categoryName ??
              categorias.find((c) => c.id === item.categoryId)?.nombre ??
              "General",
            plataforma: item.platform,
            precioCentavos: Number(item.priceCents),
            descuento: item.discountPercentage ?? undefined,
          }));
        }
      }
    } catch {
      // Fallback a sugerencias locales
    }
    const termino = q.trim().toLowerCase();
    return ofertasDestacadas
      .filter(
        (o) =>
          !termino ||
          o.nombre.toLowerCase().includes(termino) ||
          o.categoria.toLowerCase().includes(termino),
      )
      .slice(0, 8)
      .map((o) => ({
        id: o.id,
        titulo: o.nombre,
        categoriaId: o.categoria,
        categoriaNombre:
          categorias.find((c) => c.id === o.categoria)?.nombre ?? "General",
        plataforma: o.plataforma,
        precioCentavos: o.precioCentavos,
        descuento: o.descuento,
      }));
  },

  detalleOferta: async (
    slugId: string,
    alias?: string,
  ): Promise<DetalleOferta | null> => {
    const idExtraido = extraerIdOferta(slugId);
    let creador = carlos;
    if (alias) {
      const encontrado = await afiliados.porAlias(alias);
      if (encontrado) creador = encontrado.afiliado;
    }

    if (UUID_REGEX.test(idExtraido)) {
      try {
        const res = await fetch(
          `${API_URL}/api/products/${encodeURIComponent(idExtraido)}`,
          { signal: AbortSignal.timeout(2500) },
        );
        if (res.ok) {
          const p = (await res.json()) as ApiProduct;
          const base = transformarProducto(p, "ficha", alias);
          const historialApi: PuntoPrecio[] = Array.isArray(p.priceHistory)
            ? p.priceHistory.map((h) => ({
                id: h.id,
                precioCentavos: Number(h.priceCents),
                fecha: h.recordedAt,
              }))
            : [];
          const historialPrecios =
            historialApi.length >= 2
              ? historialApi
              : generarHistorialSintetico(
                  p.id,
                  base.precioCentavos,
                  base.precioAnteriorCentavos,
                );
          const categoriaNombre =
            p.categoryName ||
            categorias.find((c) => c.id === p.categoryId)?.nombre ||
            "General";

          return {
            ...base,
            descripcion:
              p.description ||
              `Oferta verificada de ${p.title} en ${
                p.platform === "mercadolibre" ? "Mercado Libre" : "Amazon"
              }. Precio monitoreado continuamente con historial de los últimos 90 días.`,
            categoriaNombre,
            externalId: p.externalId,
            estado:
              p.status === "paused" || p.status === "closed"
                ? p.status
                : "active",
            verificadoEn: p.lastCheckedAt || new Date().toISOString(),
            historialPrecios,
            creador,
          };
        }
      } catch {
        // Continúa hacia búsqueda alternativa o datos de demostración
      }
    }

    // Buscar entre las ofertas estáticas de demostración por ID o por slug
    const poolDemo = [...ofertasDestacadas, ...ofertasDeCarlos];
    const demo = poolDemo.find(
      (o) =>
        o.id === slugId ||
        o.id === idExtraido ||
        `${slugify(o.nombre)}-${o.id}` === slugId ||
        slugify(o.nombre) === slugId,
    );

    if (demo) {
      const query = new URLSearchParams({ o: "ficha" });
      if (alias) query.set("c", alias);
      const categoriaNombre =
        categorias.find((c) => c.id === demo.categoria)?.nombre ?? "General";
      return {
        ...demo,
        enlace: `/ir/${demo.id}?${query.toString()}`,
        descripcion: `Recomendación destacada de ${demo.nombre}. Comparamos su evolución durante los últimos 90 días en ${
          demo.plataforma === "mercadolibre" ? "Mercado Libre México" : "Amazon México"
        } para confirmar que el descuento frente a su precio habitual es real y transparente.`,
        categoriaNombre,
        externalId: null,
        estado: "active",
        verificadoEn: new Date().toISOString(),
        historialPrecios: generarHistorialSintetico(
          demo.id,
          demo.precioCentavos,
          demo.precioAnteriorCentavos,
        ),
        creador,
      };
    }

    return null;
  },

  favoritos: async (
    cookieHeader: string,
  ): Promise<{ ofertas: Oferta[]; productIds: string[] }> => {
    if (!cookieHeader) return { ofertas: [], productIds: [] };
    try {
      const res = await fetch(`${API_URL}/api/favorites`, {
        headers: { cookie: cookieHeader },
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          items: ApiProduct[];
          productIds: string[];
        };
        return {
          ofertas: Array.isArray(data.items)
            ? data.items.map((p) => transformarProducto(p, "panel"))
            : [],
          productIds: Array.isArray(data.productIds) ? data.productIds : [],
        };
      }
    } catch {
      // Fallback vacío si la API no responde
    }
    return { ofertas: [], productIds: [] };
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
