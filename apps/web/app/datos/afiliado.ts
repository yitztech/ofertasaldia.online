import type {
  Afiliado,
  CategoriaPrincipal,
  Coleccion,
  Oferta,
  ProductoPanel,
  PuntoClics,
  ResumenMes,
} from "./tipos";

const amazon = "https://www.amazon.com.mx";
const mercadoLibre = "https://www.mercadolibre.com.mx";

export const carlos: Afiliado = {
  alias: "carlos-tech",
  nombre: "Carlos M.",
  avatar: "/img/afiliado/carlos.png",
  verificado: true,
  descripcion:
    "Apasionado por la tecnología y los gadgets. Comparto las mejores oportunidades de Amazon y Mercado Libre que realmente valen la pena.",
  redes: [
    { red: "youtube", url: "https://www.youtube.com" },
    { red: "instagram", url: "https://www.instagram.com" },
    { red: "tiktok", url: "https://www.tiktok.com" },
    { red: "enlace", url: "https://ofertasaldia.online/c/carlos-tech" },
  ],
  ubicacion: "México",
  miembroDesde: "Miembro desde ene 2024",
  estadisticas: { seguidores: "1.2K", productos: 48, colecciones: 12, valoracion: 4.8 },
  categorias: [
    { id: "electronica", nombre: "Electrónica", productos: 18 },
    { id: "hogar", nombre: "Hogar", productos: 8 },
    { id: "moda", nombre: "Moda", productos: 6 },
    { id: "deportes", nombre: "Deportes", productos: 5 },
    { id: "juguetes", nombre: "Juguetes", productos: 4 },
  ],
  conteoPlataformas: { amazon: 32, mercadolibre: 16 },
  conteoPrecios: [
    { id: "menos-500", etiqueta: "Menos de $500", productos: 8 },
    { id: "500-1000", etiqueta: "$500 - $1,000", productos: 12 },
    { id: "1000-3000", etiqueta: "$1,000 - $3,000", productos: 18 },
    { id: "mas-3000", etiqueta: "Más de $3,000", productos: 10 },
  ],
};

/** Ofertas que Carlos recomienda (perfil público). */
export const ofertasDeCarlos: Oferta[] = [
  {
    id: "sony-wh1000xm5",
    nombre: "Audífonos Sony WH-1000XM5 Cancelación de ruido",
    imagen: "/img/productos/audifonos-sony.png",
    plataforma: "amazon",
    categoria: "electronica",
    precioCentavos: 499900,
    precioAnteriorCentavos: 729900,
    descuento: 32,
    tono: "descuento",
    valoracion: 4.8,
    resenas: 2341,
    enlace: amazon,
  },
  {
    id: "apple-watch-9",
    nombre: "Apple Watch Series 9 GPS 41 mm",
    imagen: "/img/productos/apple-watch.png",
    plataforma: "amazon",
    categoria: "electronica",
    precioCentavos: 729900,
    precioAnteriorCentavos: 899900,
    descuento: 18,
    tono: "oferta",
    valoracion: 4.7,
    resenas: 1892,
    enlace: amazon,
  },
  {
    id: "nike-air-force-1",
    nombre: "Nike Air Force 1 Tenis para hombre",
    imagen: "/img/productos/nike-force.png",
    plataforma: "mercadolibre",
    categoria: "moda",
    precioCentavos: 189900,
    etiqueta: "mas-vendido",
    valoracion: 4.9,
    resenas: 3120,
    enlace: mercadoLibre,
  },
  {
    id: "freidora-oster-4l",
    nombre: "Freidora de aire Oster 4L",
    imagen: "/img/productos/freidora-oster.png",
    plataforma: "mercadolibre",
    categoria: "hogar",
    precioCentavos: 119900,
    precioAnteriorCentavos: 159900,
    descuento: 22,
    tono: "oferta",
    valoracion: 4.6,
    resenas: 918,
    enlace: mercadoLibre,
  },
  {
    id: "lego-technic",
    nombre: "LEGO Technic Auto deportivo",
    imagen: "/img/productos/lego-technic.png",
    plataforma: "amazon",
    categoria: "juguetes",
    precioCentavos: 229900,
    precioAnteriorCentavos: 299900,
    descuento: 25,
    tono: "descuento",
    valoracion: 4.8,
    resenas: 1204,
    enlace: amazon,
  },
  {
    id: "mochila-bange",
    nombre: "Mochila antirrobo Bange para laptop 15.6\"",
    imagen: "/img/productos/mochila-bange.png",
    plataforma: "mercadolibre",
    categoria: "deportes",
    precioCentavos: 84900,
    precioAnteriorCentavos: 99900,
    descuento: 15,
    tono: "oferta",
    valoracion: 4.7,
    resenas: 640,
    enlace: mercadoLibre,
  },
  {
    id: "samsung-galaxy-s24",
    nombre: "Samsung Galaxy S24 128GB",
    imagen: "/img/productos/samsung-s24.png",
    plataforma: "amazon",
    categoria: "electronica",
    precioCentavos: 1399900,
    precioAnteriorCentavos: 1949900,
    descuento: 28,
    tono: "descuento",
    valoracion: 4.8,
    resenas: 2106,
    enlace: amazon,
  },
  {
    id: "airpods-pro-2",
    nombre: "AirPods Pro 2 Sonido espacial",
    imagen: "/img/productos/airpods-pro.png",
    plataforma: "amazon",
    categoria: "electronica",
    precioCentavos: 479900,
    precioAnteriorCentavos: 599900,
    descuento: 20,
    tono: "oferta",
    valoracion: 4.9,
    resenas: 1532,
    enlace: amazon,
  },
];

export const coleccionesDeCarlos: Coleccion[] = [
  { id: "mejores-gadgets-2024", titulo: "Mejores gadgets 2024", productos: 12, imagen: "/img/colecciones/gadgets.png" },
  { id: "esenciales-hogar", titulo: "Esenciales para el hogar", productos: 8, imagen: "/img/colecciones/hogar.png" },
  { id: "regalos-originales", titulo: "Regalos originales", productos: 10, imagen: "/img/colecciones/regalos.png" },
  { id: "setup-oficina", titulo: "Setup de oficina", productos: 9, imagen: "/img/colecciones/oficina.png" },
];

/** Datos privados del panel: estado, clics y ganancia de cada recomendación. */
const extrasPanel: Record<string, Pick<ProductoPanel, "estado" | "gananciaCentavos" | "clics">> = {
  "sony-wh1000xm5": { estado: "activo", gananciaCentavos: 25000, clics: 1234 },
  "apple-watch-9": { estado: "activo", gananciaCentavos: 26400, clics: 980 },
  "nike-air-force-1": { estado: "pendiente", gananciaCentavos: 9500, clics: 456 },
  "freidora-oster-4l": { estado: "activo", gananciaCentavos: 6000, clics: 872 },
  "lego-technic": { estado: "activo", gananciaCentavos: 11500, clics: 612 },
  "mochila-bange": { estado: "activo", gananciaCentavos: 4200, clics: 405 },
  "samsung-galaxy-s24": { estado: "sin-stock", gananciaCentavos: 70000, clics: 330 },
  "airpods-pro-2": { estado: "activo", gananciaCentavos: 24000, clics: 764 },
};

export const productosPanel: ProductoPanel[] = ofertasDeCarlos.map((oferta) => ({
  ...oferta,
  precioAnteriorCentavos: undefined,
  descuento: undefined,
  comisionPorcentaje: 5,
  ...extrasPanel[oferta.id]!,
}));

export const conteosPanel = { todos: 48, activos: 42, pendientes: 3, sinStock: 3 };

export const resumenMes: ResumenMes = {
  clics: 1234,
  productosVistos: 86,
  gananciaCentavos: 342000,
  variacionPorcentaje: 28,
};

/** Serie simulada de 30 días (1 oct a 31 oct) que termina en 128 clics el 24 oct. */
export const clicsUltimos30Dias: PuntoClics[] = [
  12, 18, 22, 20, 28, 33, 30, 36, 41, 38, 46, 44, 52, 49, 58, 63, 60, 71, 68, 77, 84, 80, 92, 128, 96, 104, 112, 108, 120, 118,
].map((clics, i) => ({ dia: i + 1, clics }));

export const categoriasPrincipales: CategoriaPrincipal[] = [
  { id: "electronica", nombre: "Electrónica", porcentaje: 42 },
  { id: "hogar", nombre: "Hogar", porcentaje: 18 },
  { id: "moda", nombre: "Moda", porcentaje: 15 },
  { id: "deportes", nombre: "Deportes", porcentaje: 12 },
  { id: "juguetes", nombre: "Juguetes", porcentaje: 8 },
];
