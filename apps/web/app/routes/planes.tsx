import {
  ArrowRightIcon,
  CheckIcon,
  CircleHelpIcon,
  CrownIcon,
  ShieldCheckIcon,
  SparklesIcon,
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
import { formatearMxn } from "~/lib/formato";
import { obtenerUsuario } from "~/servicios/auth.server";
import { crearSesionCheckout, obtenerPlanes, obtenerSuscripcion } from "~/servicios/payments.server";

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
  const [usuario, planes, suscripcion] = await Promise.all([
    obtenerUsuario(request),
    obtenerPlanes(),
    obtenerSuscripcion(request),
  ]);

  return { usuario, planes, suscripcion };
}

export async function action({ request }: Route.ActionArgs) {
  const usuario = await obtenerUsuario(request);
  if (!usuario) {
    return redirect("/registro?next=/planes");
  }

  const formData = await request.formData();
  const planId = formData.get("planId");
  if (planId !== "pro") {
    return { error: "Plan seleccionado no válido." };
  }

  const sesion = await crearSesionCheckout(request, "pro");
  if (sesion?.url) {
    return redirect(sesion.url);
  }

  return { error: "No se pudo conectar con el servicio de pagos. Inténtalo de nuevo." };
}

export default function Planes({ loaderData }: Route.ComponentProps) {
  const { usuario, planes, suscripcion } = loaderData;
  const actionData = useActionData<typeof action>();
  const [searchParams] = useSearchParams();
  const enviando = useNavigation().state === "submitting";

  const pagoCancelado = searchParams.get("pago") === "cancelado";
  const esProActivo = suscripcion.status === "active" && suscripcion.planId === "pro";

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

        {esProActivo && (
          <Alert variant="success" className="mb-8 border-violeta/40 bg-violeta/10">
            <CrownIcon className="size-5 text-violeta" aria-hidden="true" />
            <AlertDescription className="font-medium text-foreground">
              ¡Tienes el <strong>Plan Creador Pro</strong> activo! Disfrutas de todas las ventajas y herramientas avanzadas.
            </AlertDescription>
          </Alert>
        )}

        {/* Encabezado Hero */}
        <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Badge variant="secondary" className="mb-4 gap-1.5 px-3 py-1 text-xs uppercase tracking-wider">
            <SparklesIcon className="size-3.5 text-corona" aria-hidden="true" />
            Precios en pesos mexicanos (MXN)
          </Badge>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
            Impulsa tus ingresos como <span className="texto-marca">afiliado</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Planes flexibles diseñados para creadores de contenido, curadores de ofertas y profesionales del comercio electrónico. Facturación transparente sin plazos forzosos.
          </p>
        </section>

        {/* Tarjetas de Planes */}
        <section aria-label="Comparativa de planes" className="mt-12 grid gap-8 md:grid-cols-2 lg:mx-auto lg:max-w-4xl lg:gap-8">
          {planes.map((plan) => {
            const esPro = plan.id === "pro";
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
                    <Badge variant="default" className="bg-violeta px-3 py-1 text-[0.6875rem] font-bold text-white shadow-sm">
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

                  <div className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {plan.priceCents === 0 ? "Gratis" : formatearMxn(plan.priceCents)}
                    </span>
                    {plan.priceCents > 0 && (
                      <span className="text-sm font-semibold text-muted-foreground">/ mes</span>
                    )}
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
                </CardContent>

                <CardFooter className="p-6 pt-0">
                  {esPro ? (
                    esProActivo ? (
                      <Button asChild variant="outline" className="w-full">
                        <Link to="/panel">
                          Ir a mi panel
                          <ArrowRightIcon className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    ) : usuario ? (
                      <Form method="post" className="w-full">
                        <input type="hidden" name="planId" value="pro" />
                        <Button
                          type="submit"
                          variant="violeta"
                          disabled={enviando}
                          className="w-full font-bold shadow-md"
                        >
                          {enviando ? "Iniciando pago..." : "Suscribirme al Plan Pro"}
                          <ArrowRightIcon className="size-4" aria-hidden="true" />
                        </Button>
                      </Form>
                    ) : (
                      <Button asChild variant="violeta" className="w-full font-bold shadow-md">
                        <Link to="/registro?next=/planes">
                          Suscribirme al Plan Pro
                          <ArrowRightIcon className="size-4" aria-hidden="true" />
                        </Link>
                      </Button>
                    )
                  ) : (
                    <Button asChild variant="outline" className="w-full">
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
