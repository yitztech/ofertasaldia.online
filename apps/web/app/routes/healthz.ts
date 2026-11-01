/** Vivo, sin consultar dependencias: lo usa el healthcheck del compose (README, reglas de la plataforma). */
export function loader() {
  return new Response("ok", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
