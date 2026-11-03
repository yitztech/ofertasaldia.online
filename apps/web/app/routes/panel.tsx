import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { useMemo, useState } from "react";
import { AlertCircleIcon, CheckCircleIcon, CrownIcon, ExternalLinkIcon, PlusIcon, SearchIcon, SparklesIcon } from "lucide-react";
import { Suspense } from "react";
import { Await, Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/panel";
import { CabeceraAfiliado } from "~/components/afiliado/cabecera-afiliado";
import { Pestanas } from "~/components/afiliado/pestanas";
import { EstadoError, EstadoVacio, TarjetasCargando } from "~/components/comun/estados";
import { AvisosBoton, EnlaceParaAfiliados, MenuUsuario } from "~/components/layout/acciones-cabecera";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { BarraLateralPanel } from "~/components/panel/barra-lateral";
import { CategoriasPrincipales } from "~/components/panel/categorias-principales";
import { EnlaceAfiliado } from "~/components/panel/enlace-afiliado";
import { GraficaClics } from "~/components/panel/grafica-clics";
import { ResumenMes } from "~/components/panel/resumen-mes";
import { TarjetaProductoPanel } from "~/components/panel/tarjeta-producto-panel";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect } from "~/components/ui/select";
import { urlPerfil } from "~/config";
import { categorias } from "~/datos/categorias";
import type { Afiliado, CategoriaId, EstadoProducto, ProductoPanel } from "~/datos/tipos";
import { limites } from "~/lib/limites";
import { buscarOfertas, ordenarOfertas, type Orden } from "~/lib/ofertas";
import { panel } from "~/servicios/catalogo";
import { obtenerSuscripcion } from "~/servicios/payments.server";
import { cn } from "~/utils";

export function meta() {
  return [{ title: "Mi perfil · Panel de OfertasAlDia" }];
}

interface ApiMyProfile {
  userId: string;
  alias: string;
  name: string;
  email: string;
  description: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
  accentColor: string;
  socialLinks: Array<{ red: string; url: string }>;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export async function loader({ request }: Route.LoaderArgs) {
  let response: Response;
  try {
    response = await fetch(`${process.env.API_URL ?? 'http://api:3001'}/api/auth/me`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      signal: AbortSignal.timeout(5000),
    });
  } catch { throw new Response('Servicio temporalmente no disponible', { status: 503 }); }
  if (response.status === 401) throw redirect('/entrar');
  if (!response.ok) throw new Response('Servicio temporalmente no disponible', { status: 503 });
  const usuario = (await response.json()) as { id: string; name: string; email: string; role: string; verifiedAt: string | null };
  const suscripcion = await obtenerSuscripcion(request);

  let perfilApi: ApiMyProfile | null = null;
  try {
    const profRes = await fetch(`${process.env.API_URL ?? 'http://api:3001'}/api/profiles/me`, {
      headers: { cookie: request.headers.get('cookie') ?? '' },
      signal: AbortSignal.timeout(3000),
    });
    if (profRes.ok) {
      perfilApi = await profRes.json();
    }
  } catch {
    // Fallback si la API de perfiles está temporalmente no disponible
  }

  const defaultAfiliado = panel.afiliado();
  const afiliado: Afiliado = perfilApi
    ? {
        ...defaultAfiliado,
        alias: perfilApi.alias,
        nombre: perfilApi.name,
        avatar: perfilApi.avatarUrl || defaultAfiliado.avatar,
        descripcion: perfilApi.description || defaultAfiliado.descripcion,
        ubicacion: perfilApi.location || defaultAfiliado.ubicacion,
        verificado: Boolean(usuario.verifiedAt),
        redes: Array.isArray(perfilApi.socialLinks) && perfilApi.socialLinks.length > 0
          ? (perfilApi.socialLinks.filter((r) =>
              r.red === "youtube" || r.red === "instagram" || r.red === "tiktok" || r.red === "enlace"
            ) as Array<{ red: "youtube" | "instagram" | "tiktok" | "enlace"; url: string }>)
          : defaultAfiliado.redes,
      }
    : defaultAfiliado;

  return {
    usuario,
    suscripcion,
    perfilApi,
    afiliado,
    conteos: panel.conteos(),
    resumen: panel.resumen(),
    clics: panel.clics(),
    categoriasPrincipales: panel.categoriasPrincipales(),
    productos: panel.productos(),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "actualizar-perfil") {
    const alias = formData.get("alias")?.toString().trim();
    const name = formData.get("name")?.toString().trim();
    const description = formData.get("description")?.toString().trim();
    const location = formData.get("location")?.toString().trim();
    const avatarUrl = formData.get("avatarUrl")?.toString().trim() || null;
    const accentColor = formData.get("accentColor")?.toString().trim() || "#4338ca";

    const youtube = formData.get("youtube")?.toString().trim();
    const instagram = formData.get("instagram")?.toString().trim();
    const tiktok = formData.get("tiktok")?.toString().trim();
    const enlace = formData.get("enlace")?.toString().trim();

    const socialLinks: Array<{ red: string; url: string }> = [];
    if (youtube) socialLinks.push({ red: "youtube", url: youtube });
    if (instagram) socialLinks.push({ red: "instagram", url: instagram });
    if (tiktok) socialLinks.push({ red: "tiktok", url: tiktok });
    if (enlace) socialLinks.push({ red: "enlace", url: enlace });

    const origin = request.headers.get("origin") ?? process.env.SITE_URL ?? "";
    const cookie = request.headers.get("cookie") ?? "";

    try {
      const res = await fetch(`${process.env.API_URL ?? "http://api:3001"}/api/profiles/me`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          origin,
          "x-csrf": "1",
          cookie,
          "x-real-ip": request.headers.get("x-real-ip") ?? "",
        },
        body: JSON.stringify({
          alias,
          name,
          description,
          location,
          avatarUrl,
          accentColor,
          socialLinks,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (res.ok) {
        return { ok: true, mensaje: "Perfil de creador actualizado con éxito." };
      }

      const problem = (await res.json().catch(() => ({}))) as {
        code?: string;
        detail?: string;
        errors?: Array<{ field: string; message: string }>;
      };

      return {
        ok: false,
        error: problem.detail || "No se pudo actualizar el perfil.",
        errors: problem.errors,
      };
    } catch {
      return { ok: false, error: "Servicio temporalmente no disponible." };
    }
  }

  return null;
}

type FiltroEstado = "todos" | EstadoProducto;

const pestanas = [
  { id: "productos", etiqueta: "Productos" },
  { id: "colecciones", etiqueta: "Colecciones" },
  { id: "estadisticas", etiqueta: "Estadísticas" },
  { id: "guardados", etiqueta: "Guardados" },
  { id: "sobre-mi", etiqueta: "Sobre mí" },
];

function ListaProductos({ productos, conteos }: { productos: ProductoPanel[]; conteos: { todos: number; activos: number; pendientes: number; sinStock: number } }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [categoria, setCategoria] = useState<CategoriaId>("todas");

  const filtros: { id: FiltroEstado; etiqueta: string }[] = [
    { id: "todos", etiqueta: `Todos (${conteos.todos})` },
    { id: "activo", etiqueta: `Activos (${conteos.activos})` },
    { id: "pendiente", etiqueta: `Pendientes (${conteos.pendientes})` },
    { id: "sin-stock", etiqueta: `Sin stock (${conteos.sinStock})` },
  ];

  const visibles = useMemo(() => {
    const porTexto = buscarOfertas(productos, texto, categoria);
    return ordenarOfertas(
      porTexto.filter((p) => estado === "todos" || p.estado === estado),
      orden,
    );
  }, [productos, texto, categoria, estado, orden]);

  return (
    <section aria-labelledby="titulo-mis-productos" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h2 id="titulo-mis-productos" className="text-2xl font-extrabold tracking-tight">
            Mis productos
          </h2>
          <p className="m-0 text-sm text-muted-foreground">Productos que has compartido como afiliado</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <label htmlFor="buscar-productos" className="sr-only">
              Buscar en mis productos
            </label>
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2" />
            <Input
              id="buscar-productos"
              type="search"
              value={texto}
              maxLength={limites.busqueda}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar en mis productos..."
              className="pl-10"
            />
          </div>
          <Button variant="violeta" className="px-5">
            <PlusIcon aria-hidden="true" />
            Agregar producto
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={estado === f.id}
              onClick={() => setEstado(f.id)}
              className={cn(
                "min-h-11 cursor-pointer rounded-xl border px-4 text-sm font-medium transition-colors",
                estado === f.id ? "border-primary bg-acento text-primary" : "border-border bg-card text-foreground hover:bg-acento",
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
          <div className="flex flex-col gap-1">
            <label htmlFor="orden-productos" className="text-xs text-muted-foreground">
              Ordenar por
            </label>
            <NativeSelect id="orden-productos" value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
              <option value="recientes">Más recientes</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="valoracion">Mejor valorados</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="categoria-productos" className="text-xs text-muted-foreground">
              Filtrar por
            </label>
            <NativeSelect id="categoria-productos" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaId)}>
              <option value="todas">Todas las categorías</option>
              {categorias
                .filter((c) => c.id !== "todas")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      {visibles.length ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 2xl:grid-cols-4">
          {visibles.map((p) => (
            <li key={p.id} className="flex">
              <div className="w-full">
                <TarjetaProductoPanel producto={p} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EstadoVacio titulo="No hay productos con estos filtros" descripcion="Cambia la búsqueda o el estado para ver tus recomendaciones." />
      )}
    </section>
  );
}

function FormularioPerfil({
  afiliado,
  perfilApi,
  usuario,
  actionData,
  submitting,
}: {
  afiliado: Afiliado;
  perfilApi: ApiMyProfile | null;
  usuario: { name: string; email: string };
  actionData?: { ok: boolean; mensaje?: string; error?: string; errors?: Array<{ field: string; message: string }> } | null;
  submitting: boolean;
}) {
  const [descripcion, setDescripcion] = useState(perfilApi?.description ?? afiliado.descripcion);
  const [aliasActual, setAliasActual] = useState(perfilApi?.alias ?? afiliado.alias);
  const [colorAcento, setColorAcento] = useState(perfilApi?.accentColor ?? "#4338ca");

  const redesMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of perfilApi?.socialLinks ?? afiliado.redes ?? []) {
      map[r.red] = r.url;
    }
    return map;
  }, [perfilApi, afiliado]);

  return (
    <Card className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-tarjeta">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold tracking-tight text-foreground">
          Información de tu perfil de creador
        </h2>
        <p className="text-sm text-muted-foreground">
          Personaliza los datos públicos que verán tus seguidores y compradores en tu vitrina de ofertas.
        </p>
      </div>

      {actionData?.ok === true && actionData.mensaje ? (
        <Alert variant="success" role="status" aria-live="polite">
          <CheckCircleIcon className="size-4" aria-hidden="true" />
          <AlertDescription className="font-medium">{actionData.mensaje}</AlertDescription>
        </Alert>
      ) : null}

      {actionData?.ok === false && actionData.error ? (
        <Alert variant="destructive" role="alert" aria-live="assertive">
          <AlertCircleIcon className="size-4" aria-hidden="true" />
          <AlertDescription className="font-medium">{actionData.error}</AlertDescription>
        </Alert>
      ) : null}

      {/* Caja de enlace público */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tu vitrina pública</span>
          <span className="font-mono text-sm font-semibold text-foreground">
            {urlPerfil(aliasActual)}
          </span>
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <a href={urlPerfil(aliasActual)} target="_blank" rel="noopener noreferrer">
            <span>Visitar página</span>
            <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
          </a>
        </Button>
      </div>

      <Form method="post" className="flex flex-col gap-5">
        <input type="hidden" name="intent" value="actualizar-perfil" />

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Alias */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-alias">
              Alias público <span className="text-destructive">*</span>
            </Label>
            <Input
              id="perfil-alias"
              name="alias"
              value={aliasActual}
              onChange={(e) => setAliasActual(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              maxLength={limites.alias}
              required
              pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
              title="Solo letras minúsculas, números y guiones sencillos"
              placeholder="mi-canal-tech"
            />
            <p className="text-xs text-muted-foreground">
              Define tu URL en ofertasaldia.online/c/<strong>{aliasActual || "alias"}</strong>
            </p>
          </div>

          {/* Nombre visible */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-name">
              Nombre visible <span className="text-destructive">*</span>
            </Label>
            <Input
              id="perfil-name"
              name="name"
              defaultValue={perfilApi?.name ?? usuario.name}
              maxLength={limites.nombreCompleto}
              required
              placeholder="Carlos Martínez"
            />
            <p className="text-xs text-muted-foreground">
              El nombre público que aparecerá en tu cabecera.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Ubicación */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-location">Ubicación</Label>
            <Input
              id="perfil-location"
              name="location"
              defaultValue={perfilApi?.location ?? afiliado.ubicacion}
              maxLength={limites.ubicacion}
              placeholder="Ciudad de México, México"
            />
          </div>

          {/* Color de acento */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-accentColor">Color de acento</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorAcento}
                onChange={(e) => setColorAcento(e.target.value)}
                aria-label="Selector visual de color"
                className="size-11 cursor-pointer rounded-xl border border-input bg-transparent p-1"
              />
              <Input
                id="perfil-accentColor"
                name="accentColor"
                value={colorAcento}
                onChange={(e) => setColorAcento(e.target.value)}
                maxLength={7}
                pattern="^#[0-9a-fA-F]{6}$"
                placeholder="#4338ca"
                className="font-mono"
              />
            </div>
          </div>
        </div>

        {/* Biografía */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="perfil-description">Biografía o presentación</Label>
            <span className="text-xs text-muted-foreground">
              {descripcion.length} / {limites.descripcion} caracteres
            </span>
          </div>
          <textarea
            id="perfil-description"
            name="description"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={limites.descripcion}
            rows={4}
            placeholder="Cuéntale a tu comunidad qué tipo de productos recomiendas..."
            className="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Avatar URL */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="perfil-avatarUrl">Foto de perfil o avatar (URL)</Label>
          <Input
            id="perfil-avatarUrl"
            name="avatarUrl"
            defaultValue={perfilApi?.avatarUrl ?? afiliado.avatar}
            maxLength={limites.url}
            placeholder="https://..."
          />
        </div>

        {/* Redes sociales */}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="text-sm font-bold text-foreground">Redes sociales y enlaces</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="perfil-youtube" className="text-xs">Canal de YouTube</Label>
              <Input
                id="perfil-youtube"
                name="youtube"
                defaultValue={redesMap.youtube ?? ""}
                maxLength={limites.url}
                placeholder="https://www.youtube.com/@tucanal"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="perfil-instagram" className="text-xs">Instagram</Label>
              <Input
                id="perfil-instagram"
                name="instagram"
                defaultValue={redesMap.instagram ?? ""}
                maxLength={limites.url}
                placeholder="https://www.instagram.com/tuusuario"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="perfil-tiktok" className="text-xs">TikTok</Label>
              <Input
                id="perfil-tiktok"
                name="tiktok"
                defaultValue={redesMap.tiktok ?? ""}
                maxLength={limites.url}
                placeholder="https://www.tiktok.com/@tuusuario"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="perfil-enlace" className="text-xs">Enlace web personal</Label>
              <Input
                id="perfil-enlace"
                name="enlace"
                defaultValue={redesMap.enlace ?? ""}
                maxLength={limites.url}
                placeholder="https://tuenlace.com"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" disabled={submitting}>
            {submitting ? "Guardando cambios..." : "Guardar cambios del perfil"}
          </Button>
        </div>
      </Form>
    </Card>
  );
}

export default function Panel({ loaderData }: Route.ComponentProps) {
  const { usuario, suscripcion, perfilApi, afiliado, conteos, resumen, clics, categoriasPrincipales, productos } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [pestana, setPestana] = useState("productos");
  const [searchParams] = useSearchParams();
  const pagoStatus = searchParams.get("pago");
  const esProActivo = suscripcion?.status === "active" && suscripcion?.planId === "pro";

  return (
    <>
      <Cabecera
        acciones={
          <>
            <EnlaceParaAfiliados />
            <AvisosBoton />
            <MenuUsuario nombre={afiliado.nombre} avatar={afiliado.avatar} />
          </>
        }
      />
      <main id="contenido" className="contenedor grid gap-4 py-4 lg:grid-cols-[14rem_1fr] lg:gap-6">
        <BarraLateralPanel />
        <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_22rem]">
          {pagoStatus === "exitoso" || pagoStatus === "simulado" ? (
            <Alert variant="success" role="region" aria-label="Aviso de suscripción" className="border-violeta/50 bg-violeta/10 text-foreground xl:col-span-2">
              <div className="flex items-center gap-3">
                <CrownIcon className="size-5 text-corona" aria-hidden="true" />
                <AlertDescription className="font-medium">
                  ¡Suscripción completada con éxito! Tu <strong>Plan Creador Pro</strong> ya se encuentra activo.
                </AlertDescription>
              </div>
            </Alert>
          ) : null}
          {!usuario?.verifiedAt ? (
            <Alert variant="default" role="region" aria-label="Aviso de verificación de correo" className="border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-200 xl:col-span-2">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  Tu correo electrónico (<strong>{usuario?.email}</strong>) no ha sido verificado. Por favor, confirma tu cuenta para activar todas las funciones.
                </span>
                <Link to={`/verificar?correo=${encodeURIComponent(usuario?.email ?? "")}`} className="font-semibold underline hover:no-underline">
                  Verificar correo
                </Link>
              </AlertDescription>
            </Alert>
          ) : null}
          {perfilApi ? (
            <Alert className="border-primary/30 bg-primary/5 text-foreground xl:col-span-2">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Tu página pública de creador está activa en: <strong>{urlPerfil(afiliado.alias)}</strong>. Puedes editar tu biografía, enlaces y estilo en la pestaña <strong>Sobre mí</strong>.
                </span>
                <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                  <a href={urlPerfil(afiliado.alias)} target="_blank" rel="noopener noreferrer">
                    Ver vitrina <ExternalLinkIcon className="ml-1 size-3" />
                  </a>
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="xl:col-span-2"><AlertDescription>Panel de demostración: los productos, el perfil y las estadísticas son ejemplos y no representan la actividad de tu cuenta.</AlertDescription></Alert>
          )}
          <div className="flex min-w-0 flex-col gap-6">
            <CabeceraAfiliado afiliado={afiliado} variante="panel" />
            <Pestanas pestanas={pestanas} activa={pestana} onCambiar={setPestana} etiqueta="Secciones de tu perfil">
              {pestana === "productos" ? (
                <Suspense fallback={<TarjetasCargando cantidad={4} className="grid-cols-2 md:grid-cols-3 2xl:grid-cols-4" />}>
                  <Await resolve={productos} errorElement={<EstadoError />}>
                    {(lista) => <ListaProductos productos={lista} conteos={conteos} />}
                  </Await>
                </Suspense>
              ) : pestana === "sobre-mi" ? (
                <FormularioPerfil
                  afiliado={afiliado}
                  perfilApi={perfilApi}
                  usuario={usuario}
                  actionData={actionData}
                  submitting={submitting}
                />
              ) : (
                <EstadoVacio titulo="Esta sección llegará pronto" descripcion="Aún no tiene contenido. Mientras tanto, revisa tus productos o edita tu perfil en 'Sobre mí'." />
              )}
            </Pestanas>
          </div>
          <aside aria-label="Resumen" className="flex min-w-0 flex-col gap-4 xl:pt-0">
            {/* Tarjeta de estado de suscripción */}
            <Card className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-tarjeta">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tu suscripción</span>
                {esProActivo ? (
                  <Badge variant="default" className="bg-violeta text-white">PRO</Badge>
                ) : (
                  <Badge variant="outline">BÁSICO</Badge>
                )}
              </div>
              <div>
                <p className="m-0 text-base font-extrabold text-foreground">
                  {esProActivo ? "Plan Creador Pro" : "Plan Básico (Gratis)"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {esProActivo
                    ? `Activo hasta el ${suscripcion?.expiresAt ? new Date(suscripcion.expiresAt).toLocaleDateString("es-MX") : "próximo ciclo"}`
                    : "Límite de 10 productos y analítica básica."}
                </p>
              </div>
              <Button asChild size="sm" variant={esProActivo ? "outline" : "violeta"} className="w-full">
                <Link to="/planes">
                  {esProActivo ? "Ver detalles del plan" : "Mejorar a Plan Pro"}
                </Link>
              </Button>
            </Card>

            <EnlaceAfiliado url={urlPerfil(afiliado.alias)} />
            <ResumenMes resumen={resumen} />
            <GraficaClics serie={clics} />
            <CategoriasPrincipales categorias={categoriasPrincipales} />
          </aside>
        </div>
      </main>
      <Pie />
    </>
  );
}

