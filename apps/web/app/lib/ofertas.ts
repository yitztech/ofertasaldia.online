import type { CategoriaId, Oferta, PlataformaId, RangoPrecioId } from "~/datos/tipos";

export type Orden = "recientes" | "precio-asc" | "precio-desc" | "valoracion";

export interface FiltrosPerfil {
  categoria: CategoriaId;
  plataformas: PlataformaId[];
  precios: RangoPrecioId[];
  valoracionMinima: number;
  orden: Orden;
}

export const filtrosIniciales: FiltrosPerfil = {
  categoria: "todas",
  plataformas: [],
  precios: [],
  valoracionMinima: 0,
  orden: "recientes",
};

const rangosPrecio: Record<RangoPrecioId, [number, number]> = {
  "menos-500": [0, 50000],
  "500-1000": [50000, 100000],
  "1000-3000": [100000, 300000],
  "mas-3000": [300000, Infinity],
};

const quitarAcentos = (texto: string) =>
  texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function buscarOfertas<T extends Oferta>(ofertas: T[], texto: string, categoria: CategoriaId = "todas") {
  const consulta = quitarAcentos(texto.trim());
  return ofertas.filter(
    (o) =>
      (categoria === "todas" || o.categoria === categoria) &&
      (!consulta || quitarAcentos(o.nombre).includes(consulta)),
  );
}

export function ordenarOfertas<T extends Oferta>(ofertas: T[], orden: Orden) {
  const copia = [...ofertas];
  if (orden === "precio-asc") copia.sort((a, b) => a.precioCentavos - b.precioCentavos);
  if (orden === "precio-desc") copia.sort((a, b) => b.precioCentavos - a.precioCentavos);
  if (orden === "valoracion") copia.sort((a, b) => b.valoracion - a.valoracion);
  return copia;
}

export function filtrarPerfil(ofertas: Oferta[], filtros: FiltrosPerfil) {
  const filtradas = ofertas.filter((o) => {
    if (filtros.categoria !== "todas" && o.categoria !== filtros.categoria) return false;
    if (filtros.plataformas.length && !filtros.plataformas.includes(o.plataforma)) return false;
    if (filtros.valoracionMinima && o.valoracion < filtros.valoracionMinima) return false;
    if (filtros.precios.length) {
      const dentro = filtros.precios.some((id) => {
        const [min, max] = rangosPrecio[id];
        return o.precioCentavos >= min && o.precioCentavos < max;
      });
      if (!dentro) return false;
    }
    return true;
  });
  return ordenarOfertas(filtradas, filtros.orden);
}
