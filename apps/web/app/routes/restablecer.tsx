import { useState } from "react";
import { ArrowLeftIcon, CircleCheckIcon, LockIcon, ShieldCheckIcon } from "lucide-react";
import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/restablecer";
import { AuthLayout } from "~/components/auth/auth-layout";
import { CampoContrasena } from "~/components/auth/campos";
import { MedidorContrasena } from "~/components/auth/medidor-contrasena";
import { Button } from "~/components/ui/button";
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
  // Sin backend todavía: el cambio simulado vuelve al acceso.
  return redirect("/entrar?restablecida=1");
}

export default function Restablecer() {
  const resultado = useActionData<typeof action>();
  const enviando = useNavigation().state === "submitting";
  const [contrasena, setContrasena] = useState("");
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
