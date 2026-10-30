import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { Cabecera } from "~/components/cabecera";
import { Pie } from "~/components/pie";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <Meta />
        <Links />
      </head>
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
        >
          Saltar al contenido
        </a>
        <Cabecera />
        <main id="contenido">{children}</main>
        <Pie />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const noEncontrado = isRouteErrorResponse(error) && error.status === 404;
  return (
    <div className="contenedor py-16">
      <h1 className="m-0 text-3xl font-extrabold tracking-tight">
        {noEncontrado ? "No encontramos esta página" : "Algo salió mal"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {noEncontrado
          ? "Revisa la dirección o vuelve a la portada."
          : "Inténtalo de nuevo en unos minutos."}
      </p>
    </div>
  );
}
