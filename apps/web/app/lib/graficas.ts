import type { PuntoClics } from "~/datos/tipos";

export interface Linea {
  trazo: string;
  area: string;
  puntos: { x: number; y: number; clics: number; dia: number }[];
}

/** Convierte la serie diaria en rutas SVG dentro de un recuadro ancho × alto. */
export function construirLinea(serie: PuntoClics[], ancho: number, alto: number, maximo: number): Linea {
  const puntos = serie.map((p, i) => ({
    x: (i / (serie.length - 1)) * ancho,
    y: alto - (p.clics / maximo) * alto,
    clics: p.clics,
    dia: p.dia,
  }));
  const trazo = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  return { trazo, area: `${trazo} L${ancho} ${alto} L0 ${alto} Z`, puntos };
}
