import { Link } from "react-router";
import { Button } from "~/components/ui/button";

export function meta() {
  return [{ title: "Página no encontrada · OfertasAlDía" }];
}

export function loader() {
  throw new Response("No encontrado", { status: 404 });
}

export default function NoEncontrado() {
  return (
    <div className="contenedor py-16">
      <Button asChild>
        <Link to="/">Volver a la portada</Link>
      </Button>
    </div>
  );
}
