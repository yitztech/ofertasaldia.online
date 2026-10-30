export type PlataformaId = "amazon" | "mercadolibre";

export type CategoriaId =
  | "todas"
  | "electronica"
  | "hogar"
  | "moda"
  | "belleza"
  | "deportes"
  | "juguetes"
  | "herramientas"
  | "automotriz"
  | "libros"
  | "salud"
  | "mascotas"
  | "oficina";

export interface Categoria {
  id: CategoriaId;
  nombre: string;
}

export interface Oferta {
  id: string;
  nombre: string;
  imagen: string;
  plataforma: PlataformaId;
  categoria: Exclude<CategoriaId, "todas">;
  /** Dinero siempre en centavos MXN (enteros). */
  precioCentavos: number;
  precioAnteriorCentavos?: number;
  /** Porcentaje que muestra la insignia; viene calculado del servidor. */
  descuento?: number;
  /** Color de la insignia de descuento. */
  tono?: "descuento" | "oferta";
  etiqueta?: "mas-vendido";
  valoracion: number;
  resenas: number;
  enlace: string;
}

export interface Coleccion {
  id: string;
  titulo: string;
  productos: number;
  imagen: string;
}

export interface MasVendido {
  id: string;
  nombre: string;
  imagen: string;
  plataforma: PlataformaId;
  precioCentavos: number;
  descuento: number;
}

export type RedSocial = "youtube" | "instagram" | "tiktok" | "enlace";

export interface Afiliado {
  alias: string;
  nombre: string;
  avatar: string;
  verificado: boolean;
  descripcion: string;
  redes: { red: RedSocial; url: string }[];
  ubicacion: string;
  miembroDesde: string;
  estadisticas: {
    seguidores: string;
    productos: number;
    colecciones: number;
    valoracion: number;
  };
  categorias: { id: CategoriaId; nombre: string; productos: number }[];
  conteoPlataformas: Record<PlataformaId, number>;
  conteoPrecios: { id: RangoPrecioId; etiqueta: string; productos: number }[];
}

export type RangoPrecioId = "menos-500" | "500-1000" | "1000-3000" | "mas-3000";

export type EstadoProducto = "activo" | "pendiente" | "sin-stock";

export interface ProductoPanel extends Oferta {
  estado: EstadoProducto;
  gananciaCentavos: number;
  comisionPorcentaje: number;
  clics: number;
}

export interface ResumenMes {
  clics: number;
  productosVistos: number;
  gananciaCentavos: number;
  variacionPorcentaje: number;
}

export interface PuntoClics {
  dia: number;
  clics: number;
}

export interface CategoriaPrincipal {
  id: CategoriaId;
  nombre: string;
  porcentaje: number;
}
