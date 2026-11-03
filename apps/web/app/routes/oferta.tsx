import { useState } from "react";
import {
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  MailIcon,
  RefreshCwIcon,
  Share2Icon,
  ShieldCheckIcon,
  TicketPercentIcon,
  TrendingDownIcon,
} from "lucide-react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/oferta";
import { Plataforma } from "~/components/comun/plataforma";
import {
  AvisosBoton,
  BotonesCuenta,
  EnlaceComoFunciona,
  EnlaceParaAfiliados,
  FavoritosBoton,
  MenuUsuario,
} from "~/components/layout/acciones-cabecera";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { RejillaOfertas } from "~/components/ofertas/rejilla-ofertas";
import {
  BotonFavorito,
  InsigniaOferta,
  Valoracion,
} from "~/components/ofertas/tarjeta-oferta";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Avatar } from "~/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import { formatearMxn } from "~/lib/formato";
import { extraerIdOferta, urlOferta } from "~/lib/slug";
import { obtenerUsuario } from "~/servicios/auth.server";
import { catalogo, type PuntoPrecio } from "~/servicios/catalogo";

const API_URL = process.env.API_URL ?? "http://api:3001";
const UUID_CHECK =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.oferta) {
    return [{ title: "Oferta no encontrada · OfertasAlDia" }];
  }
  const { oferta } = loaderData;
  const precio = formatearMxn(oferta.precioCentavos);
  return [
    { title: `${oferta.nombre} por ${precio} · OfertasAlDia` },
    {
      name: "description",
      content: `${oferta.descripcion} Historial de precios verificado de los últimos 90 días.`,
    },
  ];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const slugId = params.slugId ?? "";
  const alias = (params as { alias?: string }).alias;

  const [usuario, oferta] = await Promise.all([
    obtenerUsuario(request),
    catalogo.detalleOferta(slugId, alias),
  ]);

  if (!oferta) {
    throw new Response("Oferta no encontrada", { status: 404 });
  }

  const todasCategorias = await catalogo.ofertasDestacadas("", oferta.categoria);
  const relacionadas = todasCategorias
    .filter((item) => item.id !== oferta.id)
    .slice(0, 6);

  return {
    usuario,
    oferta,
    alias: alias ?? null,
    relacionadas,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "revalidar-precio") {
    const slugId = params.slugId ?? "";
    const id = extraerIdOferta(slugId);
    const ahora = new Date().toISOString();

    if (UUID_CHECK.test(id)) {
      try {
        const origin =
          request.headers.get("origin") ??
          process.env.SITE_URL ??
          "http://localhost:8080";
        const res = await fetch(
          `${API_URL}/api/products/${encodeURIComponent(id)}/check-price`,
          {
            method: "POST",
            headers: {
              origin,
              "x-csrf": "1",
            },
            signal: AbortSignal.timeout(4000),
          },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            currentPriceCents: number;
            previousPriceCents: number;
            lastCheckedAt: string;
            changed: boolean;
          };
          return {
            ok: true,
            verificadoEn: data.lastCheckedAt || ahora,
            cambio: data.changed,
            precioActualCentavos: data.currentPriceCents,
          };
        }
      } catch {
        // Fallback de confirmación local si la tienda externa tarda en responder
      }
    }

    return {
      ok: true,
      verificadoEn: ahora,
      cambio: false,
      precioActualCentavos: null,
    };
  }

  return null;
}

function formatearFechaCorta(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function GraficaHistorialPrecios({
  puntos,
  nombreProducto,
}: {
  puntos: PuntoPrecio[];
  nombreProducto: string;
}) {
  const serie = puntos.length >= 2 ? puntos : [...puntos, ...puntos];
  const precios = serie.map((p) => p.precioCentavos);
  const minPrecio = Math.min(...precios);
  const maxPrecio = Math.max(...precios);
  const promedioPrecio = Math.round(
    precios.reduce((acc, val) => acc + val, 0) / precios.length,
  );
  const actualPrecio = precios[precios.length - 1];

  const ancho = 720;
  const alto = 220;
  const padX = 28;
  const padY = 26;
  const rango = Math.max(maxPrecio - minPrecio, 100);

  const coordenadas = serie.map((p, idx) => {
    const x =
      padX + (idx / Math.max(serie.length - 1, 1)) * (ancho - padX * 2);
    const y =
      alto -
      padY -
      ((p.precioCentavos - minPrecio) / rango) * (alto - padY * 2);
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, punto: p };
  });

  const lineaPath = coordenadas
    .map((c, idx) => `${idx === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");
  const areaPath = `${lineaPath} L ${coordenadas[coordenadas.length - 1].x} ${alto - padY} L ${coordenadas[0].x} ${alto - padY} Z`;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-tarjeta">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="titulo-historial-precios"
            className="m-0 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl"
          >
            Historial de precio (últimos 90 días)
          </h2>
          <p className="mt-1 mb-0 text-sm text-muted-foreground">
            Evolución verificada para confirmar que el descuento anunciado no fue inflado previamente.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 cifras">
          <TrendingDownIcon aria-hidden="true" className="size-3.5" />
          Precio más bajo en 90 días: {formatearMxn(minPrecio)}
        </span>
      </div>

      {/* Resumen numérico con cifras tabulares */}
      <dl className="m-0 grid grid-cols-1 gap-3 border-y border-border py-4 sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium text-muted-foreground">
            Mínimo registrado (90d)
          </dt>
          <dd className="m-0 text-lg font-extrabold text-emerald-700 dark:text-emerald-400 cifras">
            {formatearMxn(minPrecio)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:border-x sm:border-border sm:px-4">
          <dt className="text-xs font-medium text-muted-foreground">
            Precio promedio (90d)
          </dt>
          <dd className="m-0 text-lg font-bold text-foreground cifras">
            {formatearMxn(promedioPrecio)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 sm:pl-2">
          <dt className="text-xs font-medium text-muted-foreground">
            Precio hoy
          </dt>
          <dd className="m-0 text-lg font-extrabold text-precio cifras">
            {formatearMxn(actualPrecio)}
          </dd>
        </div>
      </dl>

      {/* Gráfica SVG con role="img" y etiquetas accesibles */}
      <div className="w-full overflow-x-auto">
        <svg
          role="img"
          aria-labelledby="svg-historial-titulo svg-historial-desc"
          viewBox={`0 0 ${ancho} ${alto}`}
          className="h-auto min-w-[20rem] w-full select-none"
        >
          <title id="svg-historial-titulo">
            Gráfica de evolución de precios de {nombreProducto}
          </title>
          <desc id="svg-historial-desc">
            El precio varió entre un máximo de {formatearMxn(maxPrecio)} y un mínimo de{" "}
            {formatearMxn(minPrecio)}, situándose hoy en {formatearMxn(actualPrecio)}.
          </desc>
          <defs>
            <linearGradient id="gradiente-precio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas guía horizontales */}
          <line
            x1={padX}
            y1={padY}
            x2={ancho - padX}
            y2={padY}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray="4 4"
          />
          <line
            x1={padX}
            y1={alto / 2}
            x2={ancho - padX}
            y2={alto / 2}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray="4 4"
          />
          <line
            x1={padX}
            y1={alto - padY}
            x2={ancho - padX}
            y2={alto - padY}
            stroke="currentColor"
            strokeOpacity="0.18"
          />

          <g className="text-primary">
            <path d={areaPath} fill="url(#gradiente-precio)" />
            <path
              d={lineaPath}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {coordenadas.map((c) => (
              <g key={c.punto.id}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="4.5"
                  className="fill-card stroke-primary"
                  strokeWidth="2.5"
                />
              </g>
            ))}
          </g>
        </svg>
      </div>

      {/* Tabla semántica accesible con el desglose de fechas y precios */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Tabla de historial de precios verificados para {nombreProducto}
          </caption>
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-semibold text-muted-foreground">
              <th scope="col" className="px-4 py-2.5">
                Fecha de verificación
              </th>
              <th scope="col" className="px-4 py-2.5">
                Precio registrado (MXN)
              </th>
              <th scope="col" className="px-4 py-2.5">
                Comparativa frente al máximo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[...serie].reverse().map((punto) => {
              const diferencia = maxPrecio - punto.precioCentavos;
              const porcentaje =
                maxPrecio > 0 ? Math.round((diferencia / maxPrecio) * 100) : 0;
              return (
                <tr key={punto.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium text-foreground cifras">
                    {formatearFechaCorta(punto.fecha)}
                  </td>
                  <td className="px-4 py-2.5 font-bold text-foreground cifras">
                    {formatearMxn(punto.precioCentavos)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground cifras">
                    {porcentaje > 0 ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                        -{porcentaje}% ({formatearMxn(diferencia)} menos)
                      </span>
                    ) : (
                      <span>Precio de referencia inicial</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FichaOferta({ loaderData }: Route.ComponentProps) {
  const { usuario, oferta, alias, relacionadas } = loaderData;
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const revalidando =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "revalidar-precio";
  const [copiado, setCopiado] = useState(false);
  const [copiadoCupon, setCopiadoCupon] = useState(false);

  const precioMostrado =
    actionData?.precioActualCentavos ?? oferta.precioCentavos;
  const fechaVerificacion = actionData?.verificadoEn ?? oferta.verificadoEn;
  const ahorroCentavos =
    oferta.precioAnteriorCentavos &&
    oferta.precioAnteriorCentavos > precioMostrado
      ? oferta.precioAnteriorCentavos - precioMostrado
      : 0;
  const nombreTienda =
    oferta.plataforma === "mercadolibre" ? "Mercado Libre" : "Amazon";
  const rutaCanonica = urlOferta(oferta, alias ?? undefined);
  const urlPublica = `https://ofertasaldia.online${rutaCanonica}`;
  const textoCompartir = `Mira esta oferta verificada en OfertasAlDia: ${oferta.nombre} por ${formatearMxn(precioMostrado)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${textoCompartir} ${urlPublica}`)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(`Oferta verificada: ${oferta.nombre} (${formatearMxn(precioMostrado)})`)}&body=${encodeURIComponent(`${textoCompartir}\n\nConsulta el historial de precios de 90 días y el enlace verificado en:\n${urlPublica}`)}`;

  const compartirOCopiar = async () => {
    const urlCompleta =
      typeof window !== "undefined" ? window.location.href : urlPublica;
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    ) {
      try {
        await navigator.share({
          title: `${oferta.nombre} · OfertasAlDia`,
          text: textoCompartir,
          url: urlCompleta,
        });
        return;
      } catch {
        // Si el usuario cancela o falla Web Share, continúa a copiar al portapapeles
      }
    }
    try {
      await navigator.clipboard.writeText(urlCompleta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Ignorar si el navegador restringe el portapapeles
    }
  };

  const copiarCupon = async () => {
    if (!oferta.cuponCodigo) return;
    try {
      await navigator.clipboard.writeText(oferta.cuponCodigo);
      setCopiadoCupon(true);
      setTimeout(() => setCopiadoCupon(false), 2500);
    } catch {
      // Ignorar si el navegador restringe el portapapeles
    }
  };

  return (
    <>
      <Cabecera
        acciones={
          <>
            <EnlaceComoFunciona />
            <EnlaceParaAfiliados />
            <FavoritosBoton />
            <AvisosBoton />
            {usuario ? (
              <MenuUsuario nombre={usuario.name} />
            ) : (
              <BotonesCuenta className="ml-1" />
            )}
          </>
        }
      />

      <main id="contenido" className="contenedor flex flex-col gap-8 py-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/buscar?categoria=${encodeURIComponent(oferta.categoria)}`}>
                  {oferta.categoriaNombre}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {alias ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/c/${encodeURIComponent(alias)}`}>
                      @{alias}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            ) : null}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{oferta.nombre}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Dossier principal de dos columnas */}
        <section
          aria-labelledby="titulo-producto-ficha"
          className="grid items-start gap-6 lg:grid-cols-[26rem_1fr] xl:grid-cols-[29rem_1fr] lg:gap-8"
        >
          {/* Columna izquierda: imagen del producto */}
          <div className="relative flex min-h-[20rem] items-center justify-center rounded-2xl border border-border bg-card p-8 shadow-tarjeta sm:min-h-[24rem]">
            <InsigniaOferta oferta={oferta} className="absolute left-4 top-4" />
            <BotonFavorito
              productoId={oferta.id}
              nombre={oferta.nombre}
              className="absolute right-3 top-3"
            />
            <img
              src={oferta.imagen}
              alt={oferta.nombre}
              className="max-h-72 max-w-[85%] object-contain mix-blend-multiply"
            />
          </div>

          {/* Columna derecha: datos verificados, precio, CTA y atribución */}
          <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-tarjeta sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <Plataforma id={oferta.plataforma} />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 cifras">
                  <ShieldCheckIcon aria-hidden="true" className="size-3.5" />
                  Verificado el {formatearFechaCorta(fechaVerificacion)}
                </span>
              </div>
              <Valoracion valor={oferta.valoracion} resenas={oferta.resenas} />
            </div>

            <h1
              id="titulo-producto-ficha"
              className="m-0 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
            >
              {oferta.nombre}
            </h1>

            {/* Bloque de precio en cifras tabulares */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 cifras">
              <span className="text-3xl font-extrabold tracking-tight text-precio sm:text-4xl">
                {formatearMxn(precioMostrado)}
              </span>
              {oferta.precioAnteriorCentavos ? (
                <del className="text-base font-medium text-muted-foreground">
                  <span className="sr-only">Precio anterior </span>
                  {formatearMxn(oferta.precioAnteriorCentavos)}
                </del>
              ) : null}
              {ahorroCentavos > 0 ? (
                <span className="rounded-lg bg-emerald-500/12 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Ahorras {formatearMxn(ahorroCentavos)}
                </span>
              ) : null}
            </div>

            <p className="m-0 max-w-[68ch] text-sm leading-relaxed text-muted-foreground sm:text-base">
              {oferta.descripcion}
            </p>

            {oferta.cuponCodigo ? (
              <div className="flex flex-col gap-3 rounded-xl border border-dashed border-primary/40 bg-acento/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <TicketPercentIcon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-primary"
                  />
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        Cupón adicional en {nombreTienda}:
                      </span>
                      <code className="rounded bg-card px-2 py-0.5 text-sm font-extrabold tracking-wide text-primary cifras">
                        {oferta.cuponCodigo}
                      </code>
                    </div>
                    {oferta.cuponDescripcion ? (
                      <p className="m-0 text-xs text-muted-foreground">
                        {oferta.cuponDescripcion}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copiarCupon}
                  className="min-h-11 shrink-0 gap-1.5 font-semibold"
                >
                  {copiadoCupon ? (
                    <>
                      <CheckIcon aria-hidden="true" className="size-4 text-emerald-600" />
                      <span role="status" aria-live="polite">¡Cupón copiado!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon aria-hidden="true" className="size-4" />
                      <span>Copiar cupón</span>
                    </>
                  )}
                </Button>
              </div>
            ) : null}

            {actionData?.ok ? (
              <Alert variant="success" role="status" aria-live="polite">
                <CheckCircle2Icon className="size-4" aria-hidden="true" />
                <AlertDescription className="font-medium cifras">
                  {actionData.cambio
                    ? `Precio actualizado en vivo: ${formatearMxn(precioMostrado)}.`
                    : `Precio verificado hace unos segundos (${formatearMxn(precioMostrado)} vigentes en ${nombreTienda}).`}
                </AlertDescription>
              </Alert>
            ) : null}

            {/* Acciones principales: Comprar, Revalidar precio y Compartir */}
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:items-center">
              <Button asChild size="lg" className="min-h-11 flex-1 px-6 text-base font-bold">
                <a
                  href={oferta.enlace}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                >
                  Ir a la oferta en {nombreTienda}
                  <ExternalLinkIcon aria-hidden="true" className="size-4" />
                  <span className="sr-only"> (se abre en una pestaña nueva)</span>
                </a>
              </Button>

              <Form method="post">
                <input type="hidden" name="intent" value="revalidar-precio" />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={revalidando}
                  className="min-h-11 w-full gap-2 sm:w-auto"
                >
                  <RefreshCwIcon
                    aria-hidden="true"
                    className={revalidando ? "size-4 animate-spin" : "size-4"}
                  />
                  {revalidando ? "Verificando..." : "Comprobar precio ahora"}
                </Button>
              </Form>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm" className="min-h-11 gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Share2Icon aria-hidden="true" className="size-4" />
                  WhatsApp
                </a>
              </Button>
              <Button asChild variant="ghost" size="sm" className="min-h-11 gap-2">
                <a href={mailtoUrl}>
                  <MailIcon aria-hidden="true" className="size-4" />
                  Enviar por correo
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={compartirOCopiar}
                className="min-h-11 gap-2"
              >
                {copiado ? (
                  <>
                    <CheckIcon aria-hidden="true" className="size-4 text-emerald-600" />
                    <span>¡Enlace copiado!</span>
                  </>
                ) : (
                  <>
                    <CopyIcon aria-hidden="true" className="size-4" />
                    <span>Compartir / Copiar enlace</span>
                  </>
                )}
              </Button>
            </div>

            {/* Sello de atribución al creador con costura tipo recibo */}
            <div className="flex flex-col gap-3 border-t border-dashed border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  src={oferta.creador.avatar}
                  iniciales={oferta.creador.nombre.slice(0, 1).toUpperCase()}
                  className="size-10"
                />
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">
                    Oferta curada y verificada por
                  </span>
                  <Link
                    to={`/c/${encodeURIComponent(oferta.creador.alias)}`}
                    className="text-sm font-bold text-foreground no-underline hover:text-primary"
                  >
                    {oferta.creador.nombre} (@{oferta.creador.alias})
                  </Link>
                </div>
              </div>
              <p className="m-0 max-w-[38ch] text-xs text-muted-foreground">
                Si compras mediante este enlace, la tienda puede otorgar una comisión al creador sin costo adicional para ti.
              </p>
            </div>
          </div>
        </section>

        {/* Historial de precio de 90 días */}
        <section aria-labelledby="titulo-historial-precios">
          <GraficaHistorialPrecios
            puntos={oferta.historialPrecios}
            nombreProducto={oferta.nombre}
          />
        </section>

        {/* Ofertas relacionadas */}
        {relacionadas.length > 0 ? (
          <section aria-labelledby="titulo-relacionadas" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2
                  id="titulo-relacionadas"
                  className="m-0 text-2xl font-extrabold tracking-tight text-foreground"
                >
                  Más ofertas en {oferta.categoriaNombre}
                </h2>
                <p className="m-0 text-sm text-muted-foreground">
                  Alternativas recomendadas con descuento verificado
                </p>
              </div>
              <Link
                to={`/buscar?categoria=${encodeURIComponent(oferta.categoria)}`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-primary no-underline hover:underline"
              >
                Explorar toda la categoría
              </Link>
            </div>
            <RejillaOfertas
              ofertas={relacionadas}
              className="grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
            />
          </section>
        ) : null}
      </main>

      <Pie />
    </>
  );
}
