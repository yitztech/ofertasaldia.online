import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...entradas: ClassValue[]) {
  return twMerge(clsx(entradas));
}

const formatoPesos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

/** Los precios viajan como enteros en centavos (AGENTS §21). */
export function formatearPesos(centavos: number) {
  return formatoPesos.format(centavos / 100);
}
