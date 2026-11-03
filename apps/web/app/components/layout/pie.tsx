import { Link } from "react-router";

export function Pie() {
  return (
    <footer className="mt-16 border-t border-border bg-card">
      <div className="contenedor flex flex-col gap-4 py-6 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="m-0 font-semibold text-foreground">OfertasAlDia</p>
            <p className="m-0 max-w-[78ch]">
              Los enlaces a Amazon y Mercado Libre son de afiliado: si compras desde ellos, el afiliado que los publicó puede
              recibir una comisión sin costo extra para ti. La compra siempre ocurre en la tienda.
            </p>
          </div>
          <nav aria-label="Enlaces legales y del sitio" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              to="/buscar"
              className="inline-flex min-h-11 items-center font-medium text-foreground no-underline hover:text-primary"
            >
              Buscador avanzado
            </Link>
            <Link
              to="/blog"
              className="inline-flex min-h-11 items-center font-medium text-foreground no-underline hover:text-primary"
            >
              Reseñas y blog
            </Link>
            <Link
              to="/planes"
              className="inline-flex min-h-11 items-center font-medium text-foreground no-underline hover:text-primary"
            >
              Planes Pro
            </Link>
            <Link
              to="/terminos"
              className="inline-flex min-h-11 items-center font-medium text-foreground no-underline hover:text-primary"
            >
              Términos y condiciones
            </Link>
            <Link
              to="/privacidad"
              className="inline-flex min-h-11 items-center font-medium text-foreground no-underline hover:text-primary"
            >
              Privacidad
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
