import { categoriasPrincipales, carlos, clicsUltimos30Dias, coleccionesDeCarlos, conteosPanel, ofertasDeCarlos, productosPanel, resumenMes } from "~/datos/afiliado";
import { categorias } from "~/datos/categorias";
import { coleccionesPopulares, masVendidos, ofertasDestacadas } from "~/datos/marketplace";
import type { CategoriaId, PlataformaId } from "~/datos/tipos";
import { buscarOfertas } from "~/lib/ofertas";

/**
 * Capa de acceso a datos. Hoy devuelve datos simulados; cuando exista el backend
 * solo cambia este archivo, no los componentes ni las rutas.
 */
const respuesta = async <T>(valor: T): Promise<T> => valor;

export const catalogo = {
  categorias: () => categorias,
  ofertasDestacadas: (texto: string, categoria: CategoriaId, plataforma?: PlataformaId) =>
    respuesta(buscarOfertas(ofertasDestacadas, texto, categoria).filter((o) => !plataforma || o.plataforma === plataforma)),
  coleccionesPopulares: () => respuesta(coleccionesPopulares),
  masVendidos: () => respuesta(masVendidos),
};

export const afiliados = {
  porAlias: async (alias: string) =>
    alias === carlos.alias
      ? { afiliado: carlos, ofertas: ofertasDeCarlos, colecciones: coleccionesDeCarlos }
      : null,
};

export const panel = {
  afiliado: () => carlos,
  productos: () => respuesta(productosPanel),
  conteos: () => conteosPanel,
  resumen: () => resumenMes,
  clics: () => clicsUltimos30Dias,
  categoriasPrincipales: () => categoriasPrincipales,
};
