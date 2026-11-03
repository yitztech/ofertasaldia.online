import { useState } from "react";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleHelpIcon,
  CrownIcon,
  ShieldCheckIcon,
  TicketPercentIcon,
  XIcon,
} from "lucide-react";
import { Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/planes";
import { BotonesCuenta, MenuUsuario } from "~/components/layout/acciones-cabecera";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { formatearMxn } from "~/lib/formato";
import { obtenerUsuario } from "~/servicios/auth.server";
import {
  cancelarSuscripcion,
  crearSesionCheckout,
  obtenerPlanes,
  obtenerSuscripcion,
  validarCupon,
  type ValidacionCupon,
} from "~/servicios/payments.server";

export function meta() {
  return [
    { title: "Planes y Precios · OfertasAlDia" },
    {
      name: "description",
      content:
        "Elige el plan ideal para monetizar tus recomendaciones de Amazon y Mercado Libre con OfertasAlDia.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const cuponUrl = url.searchParams.get("cupon")?.trim() || "";

  const [usuario, planes, suscripcion, resultadoCupon] = await Promise.all([
    obtenerUsuario(request),
    obtenerPlanes(),
    obtenerSuscripcion(request),
    cuponUrl ? validarCupon(cuponUrl) : Promise.resolve(null),
  ]);

  return {
    usuario,
    planes,
    suscripcion,
    cuponInicial: resultadoCupon && resultadoCupon.ok ? resultadoCupon.cupon : null,
    errorCuponInicial: resultadoCupon && !resultadoCupon.ok ? resultadoCupon.error : null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "suscribir");

  if (intent === "validar-cupon") {
    const code = String(formData.get("code") ?? "");
    const resultado = await validarCupon(code);
    if (resultado.ok) {
      return { cupon: resultado.cupon, errorCupon: null, error: null, cancelada: false };
    }
    return { cupon: null, errorCupon: resultado.error, error: null, cancelada: false };
  }

  if (intent === "quitar-cupon") {
    return { cupon: null, errorCupon: null, error: null, cancelada: false };
  }

  const usuario = await obtenerUsuario(request);
  if (!usuario) {
    return redirect("/registro?next=/planes");
  }

  if (intent === "cancelar-suscripcion") {
    const res = await cancelarSuscripcion(request);
    if (res.ok) {
      return { cupon: null, errorCupon: null, error: null, cancelada: true };
    }
    return {
      cupon: null,
      errorCupon: null,
      error: res.error || "No se pudo cancelar la suscripción.",
      cancelada: false,
    };
  }

  const planId = formData.get("planId");
  const couponCode = String(formData.get("couponCode") ?? "").trim();
  if (planId !== "pro") {
    return { cupon: null, errorCupon: null, error: "Plan seleccionado no válido.", cancelada: false };
  }

  const sesion = await crearSesionCheckout(request, "pro", couponCode || undefined);
  if (sesion?.url) {
    return redirect(sesion.url);
  }

  return {
    cupon: null,
    errorCupon: null,
    error: "No se pudo conectar con el servicio de pagos o el cupón ya no está disponible.",
    cancelada: false,
  };
}

export default function Planes({ loaderData }: Route.ComponentProps) {
  const { usuario, planes, suscripcion, cuponInicial, errorCuponInicial } = loaderData;
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const navigation = useNavigation();
  const enviando = navigation.state === "submitting";
  const intentActual = navigation.formData?.get("intent");

  const [codigoInput, setCodigoInput] = useState(cuponInicial?.code ?? "");

  const cuponActivo: ValidacionCupon | null =
    actionData !== undefined ? (actionData.cupon ?? null) : cuponInicial;
  const errorCupon =
    actionData !== undefined ? actionData.errorCupon : errorCuponInicial;

  const pagoCancelado = searchParams.get("pago") === "cancelado";
  const esProActivo =
    suscripcion.status === "active" &&
    suscripcion.planId === "pro" &&
    !actionData?.cancelada;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Cabecera
        conBuscador={false}
        acciones={
          usuario ? (
            <MenuUsuario nombre={usuario.name} />
          ) : (
            <BotonesCuenta />
          )
        }
      />

      <main id="contenido" className="contenedor flex flex-1 flex-col py-10 lg:py-16">
        {/* Avisos de estado de pago */}
        {pagoCancelado && (
          <Alert variant="warning" className="mb-8">
            <AlertDescription>
              El proceso de pago fue cancelado. No se realizó ningún cargo a tu cuenta ni tarjeta.
            </AlertDescription>
          </Alert>
        )}

        {actionData?.error && (
          <Alert variant="destructive" className="mb-8">
            <AlertDescription>{actionData.error}</AlertDescription>
          </Alert>
        )}

        {actionData?.cancelada && (
          <Alert variant="success" className="mb-8">
            <CheckCircle2Icon className="size-4" aria-hidden="true" />
            <AlertDescription>
              Tu suscripción al Plan Creador Pro ha sido cancelada. Tu cuenta vuelve al Plan Básico gratuito.
            </AlertDescription>
          </Alert>
        )}

        {esProActivo && (
          <Alert variant="success" className="mb-8 border-violeta/40 bg-violeta/10">
            <CrownIcon className="size-5 text-violeta" aria-hidden="true" />
            <AlertDescription className="flex flex-wrap items-center justify-between gap-4 font-medium text-foreground">
              <span>
                ¡Tienes el <strong>Plan Creador Pro</strong> activo! Disfrutas de todas las ventajas y herramientas avanzadas.
              </span>
              <Form method="post">
                <input type="hidden" name="intent" value="cancelar-suscripcion" />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={enviando}
                  className="min-h-11"
                >
                  {enviando && intentActual === "cancelar-suscripcion"
                    ? "Cancelando..."
                    : "Cancelar suscripción"}
                </Button>
              </Form>
            </AlertDescription>
          </Alert>
        )}

        {/* Encabezado Hero */}
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Impulsa tus ingresos como <span className="texto-marca">afiliado</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Planes flexibles en pesos mexicanos (MXN) diseñados para creadores de contenido, curadores de ofertas y profesionales del comercio electrónico. Facturación transparente vía Stripe sin plazos forzosos.
          </p>
        </section>

        {/* Tarjetas de Planes */}
        <section aria-label="Comparativa de planes" className="mt-12 grid gap-8 md:grid-cols-2 lg:mx-auto lg:max-w-4xl lg:gap-8">
          {planes.map((plan) => {
            const esPro = plan.id === "pro";
            const precioFinalCentavos =
              esPro && cuponActivo ? cuponActivo.finalPriceCents : plan.priceCents;
            const tieneDescuento =
              esPro && cuponActivo && cuponActivo.discountCents > 0;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between transition-shadow duration-200 ${
                  esPro
                    ? "border-2 border-violeta shadow-lg shadow-violeta/10"
                    : "border-border shadow-tarjeta"
                }`}
              >
                {esPro && (
                  <div className="absolute -top-3.5 right-6">
                    <Badge variant="default" className="bg-violeta px-3 py-1 text-xs font-bold text-white shadow-sm">
                      MÁS POPULAR
                    </Badge>
                  </div>
                )}

                <CardHeader className="p-6 pb-4">
                  <div className="flex items-center gap-2">
                    {esPro ? (
                      <CrownIcon className="size-5 text-corona" aria-hidden="true" />
                    ) : (
                      <ShieldCheckIcon className="size-5 text-muted-foreground" aria-hidden="true" />
                    )}
                    <CardTitle className="text-xl font-extrabold">{plan.name}</CardTitle>
                  </div>
                  <CardDescription className="mt-1.5 text-sm">{plan.description}</CardDescription>

                  <div className="mt-6 flex flex-wrap items-baseline gap-2 cifras">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {precioFinalCentavos === 0
                        ? "Gratis"
                        : formatearMxn(precioFinalCentavos)}
                    </span>
                    {tieneDescuento ? (
                      <del className="text-base font-medium text-muted-foreground">
                        <span className="sr-only">Precio regular </span>
                        {formatearMxn(plan.priceCents)}
                      </del>
                    ) : null}
                    {plan.priceCents > 0 && (
                      <span className="text-sm font-semibold text-muted-foreground">
                        / mes
                      </span>
                    )}
                    {tieneDescuento && cuponActivo ? (
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                        Ahorras {formatearMxn(cuponActivo.discountCents)} ({cuponActivo.code})
                      </span>
                    ) : null}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 p-6 pt-2">
                  <div className="my-4 h-px bg-border/70" />
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Lo que incluye:
                  </p>
                  <ul className="mt-4 space-y-3 p-0 list-none">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <CheckIcon
                          className={`mt-0.5 size-4 shrink-0 ${
                            esPro ? "text-violeta" : "text-muted-foreground"
                          }`}
                          aria-hidden="true"
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Caja de cupón promocional de Stripe para el Plan Pro */}
                  {esPro && !esProActivo ? (
                    <div className="mt-6 border-t border-dashed border-border pt-4">
                      {cuponActivo ? (
                        <div
                          role="status"
                          aria-live="polite"
                          className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs"
                        >
                          <div className="flex items-start gap-2">
                            <TicketPercentIcon
                              aria-hidden="true"
                              className="mt-0.5 size-4 shrink-0 text-emerald-700 dark:text-emerald-300"
                            />
                            <div>
                              <p className="m-0 font-bold text-emerald-900 dark:text-emerald-200 cifras">
                                Cupón {cuponActivo.code} aplicado
                              </p>
                              <p className="m-0 text-emerald-800/90 dark:text-emerald-300/90">
                                {cuponActivo.description}
                              </p>
                            </div>
                          </div>
                          <Form method="post">
                            <input type="hidden" name="intent" value="quitar-cupon" />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              aria-label="Quitar cupón aplicado"
                              className="min-h-11 px-2.5 text-xs"
                            >
                              <XIcon aria-hidden="true" className="size-4" />
                            </Button>
                          </Form>
                        </div>
                      ) : (
                        <Form method="post" className="flex flex-col gap-2">
                          <input type="hidden" name="intent" value="validar-cupon" />
                          <Label
                            htmlFor="codigo-cupon-pro"
                            className="flex items-center gap-1.5 text-xs font-semibold text-foreground"
                          >
                            <TicketPercentIcon aria-hidden="true" className="size-3.5 text-violeta" />
                            ¿Tienes un cupón de descuento?
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="codigo-cupon-pro"
                              name="code"
                              type="text"
                              value={codigoInput}
                              onChange={(e) => setCodigoInput(e.target.value.toUpperCase())}
                              maxLength={40}
                              placeholder="Ej. PRO50 o AHORRA100"
                              autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="characters"
                              spellCheck={false}
                              aria-describedby={errorCupon ? "error-cupon-pro" : "ayuda-cupon-pro"}
                              aria-invalid={Boolean(errorCupon)}
                              className="min-h-11 uppercase cifras"
                            />
                            <Button
                              type="submit"
                              variant="outline"
                              disabled={enviando && intentActual === "validar-cupon"}
                              className="min-h-11 shrink-0 font-semibold"
                            >
                              {enviando && intentActual === "validar-cupon"
                                ? "Validando..."
                                : "Aplicar"}
                            </Button>
                          </div>
                          {errorCupon ? (
                            <p
                              id="error-cupon-pro"
                              role="alert"
                              className="m-0 text-xs font-medium text-destructive"
                            >
                              {errorCupon}
                            </p>
                          ) : (
                            <p id="ayuda-cupon-pro" className="m-0 text-xs text-muted-foreground cifras">
                              Prueba los códigos promocionales <strong>PRO50</strong> (-50%) o <strong>AHORRA100</strong> (-$100 MXN).
                            </p>
                          )}
                        </Form>
                      )}
                    </div>
                  ) : null}
                </CardContent>

                <CardFooter className="p-6 pt-0">
                  {esPro ? (
                    esProActivo ? (
                      <Button asChild variant="outline" className="min-h-11 w-full">
                        <Link to="/panel">
                          Ir a mi panel
                          <ArrowRightIcon className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : usuario ? (
                      <Form method="post" className="w-full">
                        <input type="hidden" name="intent" value="suscribir" />
                        <input type="hidden" name="planId" value="pro" />
                        {cuponActivo ? (
                          <input type="hidden" name="couponCode" value={cuponActivo.code} />
                        ) : null}
                        <Button
                          type="submit"
                          variant="violeta"
                          disabled={enviando && intentActual === "suscribir"}
                          className="min-h-11 w-full font-bold shadow-md"
                        >
                          {enviando && intentActual === "suscribir"
                            ? "Iniciando pago..."
                            : "Suscribirme al Plan Pro"}
                          <ArrowRightIcon className="size-4" aria-hidden="true" />
                        </Button>
                      </Form>
                    ) : (
                      <Button asChild variant="violeta" className="min-h-11 w-full font-bold shadow-md">
                        <Link
                          to={
                            cuponActivo
                              ? `/registro?next=${encodeURIComponent(`/planes?cupon=${cuponActivo.code}`)}`
                              : "/registro?next=/planes"
                          }
                        >
                          Suscribirme al Plan Pro
                          <ArrowRightIcon className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    )
                  ) : (
                    <Button asChild variant="outline" className="min-h-11 w-full">
                      <Link to={usuario ? "/panel" : "/registro"}>
                        {usuario ? "Tu plan base" : "Comenzar gratis"}
                      </Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </section>

        {/* Preguntas frecuentes */}
        <section aria-labelledby="titulo-faq" className="mx-auto mt-20 max-w-3xl">
          <div className="flex items-center justify-center gap-2 text-center">
            <CircleHelpIcon className="size-6 text-primary" aria-hidden="true" />
            <h2 id="titulo-faq" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Preguntas frecuentes
            </h2>
          </div>

          <div className="mt-8 space-y-6">
            <div className="rounded-xl border border-border p-5 bg-card">
              <h3 className="text-base font-bold text-foreground">¿Cómo funciona la facturación y el cobro?</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Todos los precios están expresados en pesos mexicanos (MXN) con impuestos incluidos. La suscripción se cobra de forma mensual y automática a través de la pasarela segura Stripe.
              </p>
            </div>

            <div className="rounded-xl border border-border p-5 bg-card">
              <h3 className="text-base font-bold text-foreground">¿Qué métodos de pago son aceptados?</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Aceptamos tarjetas de crédito y débito Visa, Mastercard y American Express. Toda la información de tu tarjeta viaja cifrada y nunca toca nuestros servidores.
              </p>
            </div>

            <div className="rounded-xl border border-border p-5 bg-card">
              <h3 className="text-base font-bold text-foreground">¿Puedo cancelar en cualquier momento?</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Sí. Puedes cancelar la renovación de tu suscripción cuando lo desees desde tu panel de usuario sin penalizaciones. Conservarás los beneficios del Plan Pro hasta que concluya el período mensual pagado.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Pie />
    </div>
  );
}
