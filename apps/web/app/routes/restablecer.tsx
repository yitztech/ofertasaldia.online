import { authRequest } from "~/servicios/auth.server";
import { redirect } from "react-router";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, CircleCheckIcon, LockIcon, ShieldCheckIcon } from "lucide-react";
import { Form, Link, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/restablecer";
import { AuthLayout } from "~/components/auth/auth-layout";
import { CampoContrasena } from "~/components/auth/campos";
import { MedidorContrasena } from "~/components/auth/medidor-contrasena";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { limites } from "~/lib/limites";
import { aError, recolectar, reglasContrasena, validarContrasenaNueva } from "~/lib/validacion";

export function meta() {
  return [{ title: "Restablecer contraseña · OfertasAlDia" }];
}

export async function action({ request }: Route.ActionArgs) {
  const datos = await request.formData();
  const nueva = String(datos.get("contrasena") ?? "");
  const confirmacion = String(datos.get("confirmacion") ?? "");
  const faltan = reglasContrasena(nueva).some((r) => !r.cumple);
  const errores = recolectar(
    aError("contrasena", validarContrasenaNueva(nueva) ?? (faltan ? "Cumple todos los requisitos de la lista." : null)),
    aError("confirmacion", nueva === confirmacion ? null : "Las contraseñas no coinciden."),
  );
  if (Object.keys(errores).length) return { errores };
  try {
    const token = String(datos.get("token") ?? "");
    const response = await authRequest(request, "reset", { token, password: nueva });
    if (response.ok) return redirect("/entrar?restablecida=1");
    return { errores: { ...errores, contrasena: "El enlace no es válido o ha vencido. Solicita uno nuevo." }, noDisponible: false };
  } catch { return { errores, noDisponible: true }; }
}

export default function Restablecer() {
  const resultado = useActionData<typeof action>();
  const enviando = useNavigation().state === "submitting";
  const [contrasena, setContrasena] = useState("");
  const [token, setToken] = useState("");
  useEffect(() => { setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") ?? ""); }, []);
  const errores = resultado?.errores ?? {};
  return (
    <AuthLayout
      eyebrow="Nueva contraseña"
      titulo={
        <>
          Crea una nueva<span className="texto-marca block">contraseña</span>
        </>
      }
      descripcion="Ingresa tu nueva contraseña para continuar."
      beneficios={[
        { icono: ShieldCheckIcon, texto: "Usa una contraseña segura" },
        { icono: LockIcon, texto: "Mínimo 8 caracteres" },
        { icono: CircleCheckIcon, texto: "Incluye letras, números y un símbolo" },
      ]}
      imagen={{ src: "/img/auth/restablecer.png", ancho: 145, alto: 205 }}
      accionCabecera={{ texto: "Iniciar sesión", a: "/entrar" }}
      tituloTarjeta="Restablecer contraseña"
    >
      <Form method="post" noValidate className="flex flex-col gap-4">
        <input type="hidden" name="token" value={token} />
        {resultado?.noDisponible ? <Alert role="alert"><AlertDescription>No se pudo cambiar la contraseña. Inténtalo de nuevo.</AlertDescription></Alert> : null}
        <CampoContrasena
          id="contrasena"
          name="contrasena"
          etiqueta="Nueva contraseña"
          icono={LockIcon}
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          maxLength={limites.contrasena}
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          aria-describedby="requisitos"
          error={errores.contrasena}
        />
        <MedidorContrasena id="requisitos" reglas={reglasContrasena(contrasena)} />
        <CampoContrasena
          id="confirmacion"
          name="confirmacion"
          etiqueta="Confirmar nueva contraseña"
          icono={LockIcon}
          placeholder="Repite tu contraseña"
          autoComplete="new-password"
          maxLength={limites.contrasena}
          error={errores.confirmacion}
        />
        <Button type="submit" size="lg" disabled={enviando} className="w-full">
          {enviando ? "Guardando…" : "Restablecer contraseña"}
        </Button>
        <Link to="/entrar" className="inline-flex min-h-11 items-center justify-center gap-2 text-sm font-medium text-primary no-underline hover:underline">
          <ArrowLeftIcon aria-hidden="true" className="size-4" />
          Volver al inicio de sesión
        </Link>
      </Form>
    </AuthLayout>
  );
}
