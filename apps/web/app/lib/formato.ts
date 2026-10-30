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
