import { Link } from "react-router";
import { Cabecera } from "~/components/layout/cabecera";
import { BotonesCuenta } from "~/components/layout/acciones-cabecera";
import { Pie } from "~/components/layout/pie";
import { Button } from "~/components/ui/button";

export function meta() {
  return [{ title: "Página no encontrada · OfertasAlDia" }];
}

export function loader() {
  throw new Response("No encontrado", { status: 404 });
}

export default function NoEncontrado() {
  return (
    <>
      <Cabecera acciones={<BotonesCuenta />} />
      <main id="contenido" className="contenedor flex flex-col items-start gap-4 py-16">
        <Button asChild>
          <Link to="/">Volver a la portada</Link>
        </Button>
      </main>
      <Pie />
    </>
  );
}
