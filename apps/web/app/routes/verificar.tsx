import { authRequest } from "~/servicios/auth.server";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, CheckCircle2Icon, MailIcon, ShieldCheckIcon, AlertTriangleIcon } from "lucide-react";
import { Form, Link, useActionData, useNavigation, useSearchParams, useSubmit } from "react-router";
import type { Route } from "./+types/verificar";
import { AuthLayout } from "~/components/auth/auth-layout";
import { CampoTexto } from "~/components/auth/campos";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { limites } from "~/lib/limites";
import { validarCorreo } from "~/lib/validacion";

export function meta() {
  return [{ title: "Verificar correo electrónico · OfertasAlDia" }];
}

export async function action({ request }: Route.ActionArgs) {
  const datos = await request.formData();
  const intent = String(datos.get("intent") ?? "");

  if (intent === "resend") {
    const correo = String(datos.get("correo") ?? "");
    const error = validarCorreo(correo);
    if (error) return { error, reenviado: false, correo, verificado: false };
    try {
      const response = await authRequest(request, "resend-verification", { email: correo });
      if (response.ok) return { error: null, reenviado: true, correo, verificado: false };
    } catch {
      /* Fallo de red */
    }
    return { error: "No se pudo enviar el correo. Inténtalo más tarde.", reenviado: false, correo, verificado: false };
  }

  const token = String(datos.get("token") ?? "");
  if (!token) {
    return { error: "El enlace no contiene un token válido.", verificado: false, reenviado: false, vencido: true };
  }

  try {
    const response = await authRequest(request, "verify-email", { token });
    if (response.ok) {
      return { verificado: true, error: null, reenviado: false };
    }
    return {
      error: "El enlace de verificación no es válido o ha vencido. Los enlaces expiran a las 24 horas.",
      verificado: false,
      reenviado: false,
      vencido: true,
    };
  } catch {
    return { error: "No se pudo verificar el correo. Inténtalo de nuevo.", verificado: false, reenviado: false };
  }
}

export default function Verificar() {
  const resultado = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const enviando = navigation.state === "submitting";

  const [token, setToken] = useState("");
  const [correo, setCorreo] = useState(searchParams.get("correo") ?? "");
  const autoSubmitted = useRef(false);

  useEffect(() => {
    // 1. Extraer token de fragmento (#token=...) o parámetro (?token=...)
    const hash = window.location.hash.slice(1);
    const hashParams = new URLSearchParams(hash);
    const t = hashParams.get("token") || searchParams.get("token") || "";
    if (t) {
      setToken(t);
      if (!autoSubmitted.current && !resultado) {
        autoSubmitted.current = true;
        const fd = new FormData();
        fd.set("intent", "verify");
        fd.set("token", t);
        submit(fd, { method: "post" });
      }
    }
  }, [searchParams, submit, resultado]);

  return (
    <AuthLayout
      eyebrow="Seguridad de la cuenta"
      titulo={
        <>
          Verificación de<span className="texto-marca block">correo electrónico</span>
        </>
      }
      descripcion="Asegura tu cuenta y activa todas las funciones de la plataforma."
      beneficios={[
        { icono: ShieldCheckIcon, texto: "Protege tu cuenta contra accesos no autorizados" },
        { icono: MailIcon, texto: "Recibe notificaciones importantes de tus ofertas" },
        { icono: CheckCircle2Icon, texto: "Activa tus enlaces y herramientas de afiliado" },
      ]}
      imagen={{ src: "/img/auth/recuperar.png", ancho: 140, alto: 225 }}
      accionCabecera={{ texto: "Iniciar sesión", a: "/entrar" }}
      tituloTarjeta="Verificar dirección de correo"
      subtituloTarjeta={
        resultado?.verificado
          ? "¡Tu cuenta está lista!"
          : "Confirma que tienes acceso a este correo para continuar."
      }
    >
      {resultado?.verificado ? (
        <div className="flex flex-col gap-4 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2Icon className="size-8" aria-hidden="true" />
          </div>
          <p className="text-sm text-muted-foreground">
            Tu dirección de correo electrónico ha sido confirmada con éxito. Ya puedes acceder a todas las funciones de afiliado y panel.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link to="/panel">Ir a mi panel</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {resultado?.error ? (
            <Alert role="alert">
              <AlertTriangleIcon className="size-4" aria-hidden="true" />
              <AlertDescription>{resultado.error}</AlertDescription>
            </Alert>
          ) : null}

          {resultado?.reenviado ? (
            <Alert variant="default" role="status" className="border-primary/50 bg-primary/10 text-primary">
              <CheckCircle2Icon className="size-4" aria-hidden="true" />
              <AlertDescription>
                Se ha enviado un nuevo enlace de verificación a <strong>{resultado.correo}</strong>. Revisa tu bandeja de entrada o carpeta de spam.
              </AlertDescription>
            </Alert>
          ) : null}

          {token && !resultado?.vencido ? (
            <Form method="post" className="flex flex-col gap-4">
              <input type="hidden" name="intent" value="verify" />
              <input type="hidden" name="token" value={token} />
              <Button type="submit" size="lg" disabled={enviando} className="w-full">
                {enviando ? "Verificando…" : "Confirmar verificación"}
              </Button>
            </Form>
          ) : (
            <Form method="post" noValidate className="flex flex-col gap-4">
              <input type="hidden" name="intent" value="resend" />
              <p className="text-sm text-muted-foreground">
                Ingresa tu correo electrónico para recibir un nuevo enlace de verificación (válido durante 24 horas):
              </p>
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
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                error={resultado?.error ?? undefined}
              />
              <Button type="submit" size="lg" disabled={enviando} className="w-full">
                {enviando ? "Enviando enlace…" : "Reenviar enlace de verificación"}
              </Button>
            </Form>
          )}

          <Link
            to="/entrar"
            className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-primary no-underline hover:underline"
          >
            <ArrowLeftIcon aria-hidden="true" className="size-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
