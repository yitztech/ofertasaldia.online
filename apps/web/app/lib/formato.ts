const pesos = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const enteros = new Intl.NumberFormat("es-MX");

/** Los importes viajan como enteros en centavos (AGENTS §21). */
export function formatearMxn(centavos: number) {
  return `${pesos.format(centavos / 100)} MXN`;
}

export function formatearNumero(valor: number) {
  return enteros.format(valor);
}

export function formatearValoracion(valor: number) {
  return valor.toFixed(1);
}

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic"
];

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
];

export function formatearFechaCorta(fecha: string | Date | null | undefined): string {
  if (!fecha) return "Reciente";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "Reciente";
  return `${d.getUTCDate()} ${MESES_CORTOS[d.getUTCMonth()]}`;
}

export function formatearFechaLarga(fecha: string | Date | null | undefined): string {
  if (!fecha) return "Borrador";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return "Borrador";
  return `${d.getUTCDate()} de ${MESES_LARGOS[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}
