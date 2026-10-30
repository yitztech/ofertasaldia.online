import { ArrowLeftIcon, ClockIcon, MailIcon, ShieldCheckIcon } from "lucide-react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/recuperar";
import { AuthLayout } from "~/components/auth/auth-layout";
import { CampoTexto } from "~/components/auth/campos";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { limites } from "~/lib/limites";
import { validarCorreo } from "~/lib/validacion";

export function meta() {
  return [{ title: "Recuperar contraseña · OfertasAlDia" }];
}

export async function action({ request }: Route.ActionArgs) {
  const datos = await request.formData();
  const correo = String(datos.get("correo") ?? "");
  const error = validarCorreo(correo);
  if (error) return { error, enviado: false as const, correo };
  // Misma respuesta exista o no la cuenta (AGENTS §22). El envío real llega con el backend.
  return { error: null, enviado: true as const, correo };
}

export default function Recuperar() {
  const resultado = useActionData<typeof action>();
  const enviando = useNavigation().state === "submitting";
  return (
    <AuthLayout
      eyebrow="Recupera tu acceso"
      titulo={
        <>
          ¿Olvidaste tu <span className="texto-marca">contraseña?</span>
        </>
      }
      descripcion="No te preocupes, te ayudamos a recuperar tu cuenta."
      beneficios={[
        { icono: MailIcon, texto: "Te enviaremos un enlace seguro" },
        { icono: ShieldCheckIcon, texto: "Tus datos están protegidos" },
        { icono: ClockIcon, texto: "El proceso solo toma unos segundos" },
      ]}
      imagen={{ src: "/img/auth/recuperar.png", ancho: 140, alto: 225 }}
      accionCabecera={{ texto: "Iniciar sesión", a: "/entrar" }}
      tituloTarjeta="Recuperar contraseña"
      subtituloTarjeta="Ingresa el correo electrónico con el que te registraste y te enviaremos un enlace para restablecer tu contraseña."
    >
      <Form method="post" noValidate className="flex flex-col gap-4">
        {resultado?.enviado ? (
          <Alert variant="success" role="status">
            <AlertDescription>
              Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.
            </AlertDescription>
          </Alert>
        ) : null}
        <CampoTexto
          id="correo"
          name="correo"
          type="email"
          etiqueta="Correo electrónico"
          icono={MailIcon}
          placeholder="tu@email.com"
          autoComplete="email"
          inputMode="email"
          maxLength={limites.correo}
          defaultValue={resultado?.correo}
          error={resultado?.error ?? undefined}
        />
        <Button type="submit" size="lg" disabled={enviando} className="w-full">
          {enviando ? "Enviando…" : "Enviar enlace"}
        </Button>
        <Link to="/entrar" className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-primary no-underline hover:underline">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Volver al inicio de sesión
        </Link>
      </Form>
    </AuthLayout>
  );
}
