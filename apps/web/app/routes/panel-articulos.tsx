import {
  BookOpenIcon,
  CrownIcon,
  Edit3Icon,
  ExternalLinkIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { Form, Link, redirect } from "react-router";
import type { Route } from "./+types/panel-articulos";
import { BotonesCuenta, MenuUsuario } from "~/components/layout/acciones-cabecera";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { BarraLateralPanel } from "~/components/panel/barra-lateral";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { formatearFechaCorta } from "~/lib/formato";
import { obtenerUsuario } from "~/servicios/auth.server";
import { eliminarArticulo, obtenerMisArticulos, type Articulo } from "~/servicios/blog.server";
import { obtenerSuscripcion } from "~/servicios/payments.server";

export function meta() {
  return [{ title: "Mis Artículos y Reviews · Panel de OfertasAlDia" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await obtenerUsuario(request);
  if (!usuario) {
    throw redirect("/entrar?next=/panel/articulos");
  }

  const [suscripcion, articulos] = await Promise.all([
    obtenerSuscripcion(request),
    obtenerMisArticulos(request),
  ]);

  return { usuario, suscripcion, articulos };
}

export async function action({ request }: Route.ActionArgs) {
  const usuario = await obtenerUsuario(request);
  if (!usuario) throw redirect("/entrar");

  const formData = await request.formData();
  const intent = formData.get("intent");
  const articleId = String(formData.get("articleId") ?? "");

  if (intent === "delete" && articleId) {
    const res = await eliminarArticulo(request, articleId);
    if (!res.ok) {
      return { error: res.error || "No se pudo eliminar el artículo." };
    }
  }

  return { ok: true };
}

export default function PanelArticulos({ loaderData }: Route.ComponentProps) {
  const { usuario, suscripcion, articulos } = loaderData;
  const esPro = suscripcion.status === "active" && suscripcion.planId === "pro";

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Cabecera
        acciones={<MenuUsuario nombre={usuario.name} />}
      />

      <main id="contenido" className="contenedor grid gap-6 py-6 lg:grid-cols-[14rem_1fr] lg:gap-8 flex-1">
        <BarraLateralPanel />

        <div className="flex flex-col gap-6 min-w-0">
          {/* Encabezado de sección */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
                Mis reseñas y artículos
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Publica análisis a fondo de tus productos recomendados y genera comisiones como creador.
              </p>
            </div>

            {esPro ? (
              <Button asChild variant="violeta" className="gap-2 font-bold shadow-sm">
                <Link to="/panel/articulos/nuevo">
                  <PlusIcon className="size-4" aria-hidden="true" />
                  <span>Escribir nueva reseña</span>
                </Link>
              </Button>
            ) : null}
          </div>

          {/* Aviso si no tiene Plan Pro */}
          {!esPro && (
            <Card className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border-2 border-violeta/40 bg-gradient-to-r from-violeta/10 via-background to-violeta/5 p-6 shadow-md">
              <div className="flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-xl bg-violeta text-white shrink-0">
                  <CrownIcon className="size-6" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-foreground m-0">
                    Publicación de artículos exclusiva para miembros Plan Pro
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground m-0">
                    Mejora tu cuenta al Plan Creador Pro para redactar reviews ilimitadas con nuestro editor WordPress e indexar tus enlaces en Google.
                  </p>
                </div>
              </div>
              <Button asChild variant="violeta" className="shrink-0 font-bold shadow-md">
                <Link to="/planes">
                  <SparklesIcon className="size-4" aria-hidden="true" />
                  <span>Ver Planes</span>
                </Link>
              </Button>
            </Card>
          )}

          {/* Listado de artículos */}
          {articulos.length > 0 ? (
            <div className="grid gap-4">
              {articulos.map((art) => (
                <Card
                  key={art.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant={art.status === "published" ? "default" : "secondary"} className="text-[0.6875rem]">
                        {art.status === "published" ? "Publicado" : "Borrador"}
                      </Badge>
                      {art.categoryName && (
                        <span className="text-xs text-muted-foreground">· {art.categoryName}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        · {formatearFechaCorta(art.createdAt)}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-foreground m-0 line-clamp-1">
                      {art.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 m-0">
                      {art.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end border-t border-border/50 pt-3 sm:border-0 sm:pt-0">
                    {art.status === "published" && (
                      <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                        <Link to={`/blog/${art.slug}`} target="_blank">
                          <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
                          <span>Ver</span>
                        </Link>
                      </Button>
                    )}

                    <Form method="post" onSubmit={(e) => {
                      if (!confirm("¿Seguro que deseas eliminar este artículo?")) e.preventDefault();
                    }}>
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="articleId" value={art.id} />
                      <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 text-xs">
                        <Trash2Icon className="size-3.5" aria-hidden="true" />
                        <span className="sr-only">Eliminar artículo</span>
                      </Button>
                    </Form>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
              <BookOpenIcon className="size-12 text-muted-foreground/40" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold text-foreground">Aún no has escrito ningún artículo</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                Comparte tus experiencias de compra y ayuda a otros compradores a elegir los mejores productos.
              </p>
              {esPro && (
                <Button asChild variant="violeta" size="sm" className="mt-6 gap-1.5 font-bold shadow-sm">
                  <Link to="/panel/articulos/nuevo">
                    <PlusIcon className="size-4" aria-hidden="true" />
                    <span>Redactar primera reseña</span>
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      <Pie />
    </div>
  );
}
