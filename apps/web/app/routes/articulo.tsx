import {
  ArrowLeftIcon,
  BookOpenIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  Share2Icon,
  ShoppingBagIcon,
  SparklesIcon,
  UserCheckIcon,
} from "lucide-react";
import { Link } from "react-router";
import type { Route } from "./+types/articulo";
import { BotonesCuenta, MenuUsuario } from "~/components/layout/acciones-cabecera";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { formatearFechaLarga, formatearMxn } from "~/lib/formato";
import { obtenerUsuario } from "~/servicios/auth.server";
import { obtenerArticulo } from "~/servicios/blog.server";

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.articulo) {
    return [{ title: "Artículo no encontrado · OfertasAlDia" }];
  }
  return [
    { title: `${loaderData.articulo.title} · OfertasAlDia Blog` },
    { name: "description", content: loaderData.articulo.summary },
  ];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const slug = params.slug;
  if (!slug) throw new Response("Artículo no encontrado", { status: 404 });

  const [usuario, articulo] = await Promise.all([
    obtenerUsuario(request),
    obtenerArticulo(slug, request),
  ]);

  if (!articulo) {
    throw new Response("Artículo no encontrado", { status: 404 });
  }

  return { usuario, articulo };
}

export default function ArticuloDetalle({ loaderData }: Route.ComponentProps) {
  const { usuario, articulo } = loaderData;

  const palabras = articulo.content ? articulo.content.split(/\s+/).length : 200;
  const minutos = Math.max(1, Math.ceil(palabras / 200));

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Cabecera
        conBuscador={false}
        acciones={usuario ? <MenuUsuario nombre={usuario.name} /> : <BotonesCuenta />}
      />

      <main id="contenido" className="contenedor flex flex-1 flex-col py-8 lg:py-12">
        {/* Miga de pan accesible */}
        <nav aria-label="Migas de pan" className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground no-underline">
            Inicio
          </Link>
          <ChevronRightIcon className="size-3.5" aria-hidden="true" />
          <Link to="/blog" className="hover:text-foreground no-underline">
            Blog & Reviews
          </Link>
          {articulo.categoryName && (
            <>
              <ChevronRightIcon className="size-3.5" aria-hidden="true" />
              <Link to={`/blog?categoria=${articulo.categoryId}`} className="hover:text-foreground no-underline">
                {articulo.categoryName}
              </Link>
            </>
          )}
          <ChevronRightIcon className="size-3.5" aria-hidden="true" />
          <span className="font-medium text-foreground truncate max-w-xs">{articulo.title}</span>
        </nav>

        {/* Encabezado del artículo */}
        <header className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {articulo.categoryName && (
              <Badge variant="default" className="bg-primary text-primary-foreground">
                {articulo.categoryName}
              </Badge>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="size-3.5" aria-hidden="true" />
              {formatearFechaLarga(articulo.publishedAt)}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ClockIcon className="size-3.5" aria-hidden="true" />
              {minutos} min de lectura
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-foreground leading-tight">
            {articulo.title}
          </h1>

          <p className="text-lg text-muted-foreground font-medium leading-relaxed border-l-4 border-violeta pl-4 py-1">
            {articulo.summary}
          </p>

          {/* Tarjeta de autor */}
          <div className="flex items-center justify-between border-y border-border/70 py-4 my-2">
            <div className="flex items-center gap-3">
              <Avatar
                src={articulo.authorAvatarUrl ?? undefined}
                iniciales={articulo.authorName.slice(0, 1).toUpperCase()}
                className="size-10"
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-foreground">{articulo.authorName}</span>
                  <Badge variant="secondary" className="gap-1 text-[0.625rem] px-1.5 py-0">
                    <UserCheckIcon className="size-3 text-corona" aria-hidden="true" />
                    Afiliado Verificado
                  </Badge>
                </div>
                {articulo.authorAlias && (
                  <Link to={`/c/${articulo.authorAlias}`} className="text-xs text-muted-foreground hover:text-primary no-underline">
                    Ver perfil del creador
                  </Link>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                  alert("¡Enlace copiado al portapapeles!");
                }
              }}
              className="gap-1.5 text-xs"
            >
              <Share2Icon className="size-3.5" aria-hidden="true" />
              Compartir
            </Button>
          </div>
        </header>

        {/* Imagen destacada de portada */}
        {articulo.coverImageUrl && (
          <div className="mx-auto my-6 w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={articulo.coverImageUrl}
              alt={articulo.title}
              className="max-h-[28rem] w-full object-cover"
            />
          </div>
        )}

        {/* Producto destacado de la reseña (Widget de afiliado) */}
        {articulo.productId && articulo.productTitle && (
          <section aria-label="Producto analizado" className="mx-auto my-8 w-full max-w-3xl">
            <Card className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border-2 border-violeta/40 bg-gradient-to-r from-violeta/10 via-background to-violeta/5 p-6 shadow-md">
              <div className="flex items-center gap-4 min-w-0">
                {articulo.productImageUrl && (
                  <img
                    src={articulo.productImageUrl}
                    alt={articulo.productTitle}
                    className="size-20 rounded-xl object-contain bg-white p-1 border border-border shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <Badge variant="default" className="bg-violeta text-white text-[0.625rem] mb-1 font-bold">
                    PRODUCTO ANALIZADO
                  </Badge>
                  <h3 className="text-base font-extrabold text-foreground line-clamp-2 m-0">
                    {articulo.productTitle}
                  </h3>
                  {articulo.productPriceCents && (
                    <p className="text-xl font-extrabold text-precio m-0 mt-1">
                      {formatearMxn(Number(articulo.productPriceCents))}
                    </p>
                  )}
                  {articulo.productPlatform && (
                    <span className="text-xs text-muted-foreground capitalize">
                      Disponible en {articulo.productPlatform === "amazon" ? "Amazon México" : "Mercado Libre"}
                    </span>
                  )}
                </div>
              </div>

              <Button asChild variant="violeta" className="w-full sm:w-auto font-bold shadow-md shrink-0">
                <a
                  href={`/c/${articulo.authorAlias ?? "recomendado"}?producto=${articulo.productId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ShoppingBagIcon className="size-4" aria-hidden="true" />
                  <span>Ver oferta en tienda</span>
                </a>
              </Button>
            </Card>
          </section>
        )}

        {/* Cuerpo del artículo */}
        <article className="mx-auto w-full max-w-3xl space-y-6 text-base leading-relaxed text-foreground/90">
          {articulo.content?.split("\n\n").map((parrafo, i) => {
            const p = parrafo.trim();
            if (!p) return null;
            if (p.startsWith("## ")) {
              return (
                <h2 key={i} className="text-2xl font-extrabold tracking-tight text-foreground mt-8 mb-3">
                  {p.replace("## ", "")}
                </h2>
              );
            }
            if (p.startsWith("### ")) {
              return (
                <h3 key={i} className="text-xl font-bold tracking-tight text-foreground mt-6 mb-2">
                  {p.replace("### ", "")}
                </h3>
              );
            }
            if (p.startsWith("> ")) {
              return (
                <blockquote key={i} className="border-l-4 border-violeta bg-violeta/5 p-4 rounded-r-xl italic text-foreground my-6">
                  {p.replace("> ", "")}
                </blockquote>
              );
            }
            if (p.startsWith("- ")) {
              const items = p.split("\n- ").map((item) => item.replace(/^- /, ""));
              return (
                <ul key={i} className="list-disc pl-6 space-y-2 my-4">
                  {items.map((it, idx) => (
                    <li key={idx}>{it}</li>
                  ))}
                </ul>
              );
            }
            return <p key={i}>{p}</p>;
          })}
        </article>

        {/* Pie de navegación del artículo */}
        <div className="mx-auto mt-12 w-full max-w-3xl border-t border-border pt-8 flex items-center justify-between">
          <Button asChild variant="outline">
            <Link to="/blog">
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              <span>Volver a todas las reseñas</span>
            </Link>
          </Button>

          {usuario && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/panel/articulos">Administrar mis artículos</Link>
            </Button>
          )}
        </div>
      </main>

      <Pie />
    </div>
  );
}
