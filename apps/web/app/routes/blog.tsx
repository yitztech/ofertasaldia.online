import {
  BookOpenIcon,
  CrownIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/blog";
import { BotonesCuenta, MenuUsuario } from "~/components/layout/acciones-cabecera";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { categorias } from "~/datos/categorias";
import { formatearFechaCorta } from "~/lib/formato";
import { obtenerUsuario } from "~/servicios/auth.server";
import { obtenerArticulos, type Articulo } from "~/servicios/blog.server";
import { cn } from "~/utils";

export function meta() {
  return [
    { title: "Blog y Reviews de Productos · OfertasAlDia" },
    {
      name: "description",
      content:
        "Reseñas detalladas, comparativas y análisis a fondo de productos de Amazon y Mercado Libre redactados por creadores y afiliados expertos.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const category = url.searchParams.get("categoria") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;

  const [usuario, articulosRes] = await Promise.all([
    obtenerUsuario(request),
    obtenerArticulos({ category, q, limit: 30 }),
  ]);

  return {
    usuario,
    articulos: articulosRes.items,
    categoriaSeleccionada: category ?? "todas",
    busqueda: q ?? "",
  };
}

export default function Blog({ loaderData }: Route.ComponentProps) {
  const { usuario, articulos, categoriaSeleccionada } = loaderData;
  const [params, setParams] = useSearchParams();
  const [busquedaLocal, setBusquedaLocal] = useState(loaderData.busqueda);

  const articulosFiltrados = useMemo(() => {
    if (!busquedaLocal.trim()) return articulos;
    const term = busquedaLocal.toLowerCase();
    return articulos.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.summary.toLowerCase().includes(term) ||
        (a.categoryName && a.categoryName.toLowerCase().includes(term)),
    );
  }, [articulos, busquedaLocal]);

  const cambiarCategoria = (catId: string) => {
    const next = new URLSearchParams(params);
    if (catId === "todas") {
      next.delete("categoria");
    } else {
      next.set("categoria", catId);
    }
    setParams(next);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Cabecera
        conBuscador={false}
        acciones={usuario ? <MenuUsuario nombre={usuario.name} /> : <BotonesCuenta />}
      />

      <main id="contenido" className="contenedor flex flex-1 flex-col py-10 lg:py-16">
        {/* Hero del Blog */}
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 text-xs uppercase tracking-wider">
            <BookOpenIcon className="size-3.5 text-primary" aria-hidden="true" />
            Reviews y Guías de Compra
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Análisis honestos por <span className="texto-marca">creadores expertos</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Descubre pruebas de rendimiento, pros, contras y veredictos imparciales de los productos más populares antes de comprar.
          </p>

          {/* Buscador de artículos */}
          <div className="mt-8 relative w-full max-w-md">
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              value={busquedaLocal}
              onChange={(e) => setBusquedaLocal(e.target.value)}
              placeholder="Buscar reseñas de productos..."
              className="pl-10"
              aria-label="Buscar en el blog"
            />
          </div>
        </section>

        {/* Filtros de categoría */}
        <section aria-label="Filtro por categorías" className="mt-10 flex flex-wrap items-center justify-center gap-2">
          {categorias.map((c) => {
            const activa =
              (c.id === "todas" && categoriaSeleccionada === "todas") ||
              c.id === categoriaSeleccionada;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => cambiarCategoria(c.id)}
                aria-pressed={activa}
                className={cn(
                  "min-h-9 cursor-pointer rounded-full border px-4 text-xs font-semibold transition-colors",
                  activa
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {c.nombre}
              </button>
            );
          })}
        </section>

        {/* Listado de artículos en cuadrícula */}
        <section aria-label="Listado de artículos" className="mt-12">
          {articulosFiltrados.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articulosFiltrados.map((art) => (
                <Card
                  key={art.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <Link to={`/blog/${art.slug}`} className="no-underline">
                    {/* Imagen de portada */}
                    <div className="relative aspect-video w-full overflow-hidden bg-muted">
                      {art.coverImageUrl ? (
                        <img
                          src={art.coverImageUrl}
                          alt={art.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground">
                          <BookOpenIcon className="size-10 opacity-40" aria-hidden="true" />
                        </div>
                      )}
                      {art.categoryName && (
                        <div className="absolute left-3 top-3">
                          <Badge variant="default" className="bg-card/90 text-foreground backdrop-blur-md">
                            {art.categoryName}
                          </Badge>
                        </div>
                      )}
                    </div>

                    <CardHeader className="p-5 pb-2">
                      <CardTitle className="text-lg font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                        {art.title}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="p-5 pt-0">
                      <p className="m-0 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {art.summary}
                      </p>
                    </CardContent>
                  </Link>

                  <CardFooter className="flex items-center justify-between border-t border-border/60 p-5 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar
                        src={art.authorAvatarUrl ?? undefined}
                        iniciales={art.authorName.slice(0, 1).toUpperCase()}
                        className="size-6"
                      />
                      <span className="font-medium text-foreground">{art.authorName}</span>
                    </div>

                    <span>{formatearFechaCorta(art.publishedAt)}</span>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <BookOpenIcon className="size-12 text-muted-foreground/40" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold text-foreground">No encontramos reseñas con estos filtros</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Prueba buscando otro término o seleccionando una categoría diferente.
              </p>
            </div>
          )}
        </section>

        {/* Banner CTA para creadores de contenido */}
        <section aria-label="Llamada a la acción para creadores" className="mt-20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-2xl border border-violeta/40 bg-gradient-to-r from-violeta/10 via-background to-violeta/5 p-8 shadow-tarjeta">
            <div className="flex items-center gap-4">
              <div className="grid size-12 place-items-center rounded-xl bg-violeta text-white shrink-0">
                <CrownIcon className="size-6" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-foreground m-0">
                  ¿Eres creador o afiliado? Publica tus propias reviews
                </h3>
                <p className="mt-1 text-sm text-muted-foreground m-0">
                  Con el Plan Pro obtienes acceso a nuestro editor WordPress para redactar análisis de productos con tus enlaces de afiliado y posicionar en Google.
                </p>
              </div>
            </div>
            <Button asChild variant="violeta" className="shrink-0 font-bold shadow-md">
              <Link to="/planes">
                <SparklesIcon className="size-4" aria-hidden="true" />
                <span>Ver Plan Creador Pro</span>
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Pie />
    </div>
  );
}
