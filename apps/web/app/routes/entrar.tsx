import { HeartIcon, LockIcon, MailIcon, ShieldCheckIcon, ZapIcon } from "lucide-react";
import { Form, Link, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import type { Route } from "./+types/entrar";
import { AuthLayout } from "~/components/auth/auth-layout";
import { BotonesSociales } from "~/components/auth/botones-sociales";
import { CampoContrasena, CampoTexto } from "~/components/auth/campos";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { limites } from "~/lib/limites";
import { aError, recolectar, validarContrasenaSimple, validarCorreo } from "~/lib/validacion";

export function meta() {
  return [{ title: "Iniciar sesión · OfertasAlDia" }];
}

export async function action({ request }: Route.ActionArgs) {
  const datos = await request.formData();
  const correo = String(datos.get("correo") ?? "");
  const contrasena = String(datos.get("contrasena") ?? "");
  const errores = recolectar(
    aError("correo", validarCorreo(correo)),
    aError("contrasena", validarContrasenaSimple(contrasena)),
  );
  if (Object.keys(errores).length) return { errores, correo };
  // Sin backend todavía: el acceso simulado lleva al panel.
  return redirect("/panel");
}

export default function Entrar() {
  const resultado = useActionData<typeof action>();
  const enviando = useNavigation().state === "submitting";
  const [params] = useSearchParams();
  const errores = resultado?.errores ?? {};
  return (
    <AuthLayout
      eyebrow="Descubre · Compara · Ahorra"
      titulo={
        <>
          Bienvenido de <span className="texto-marca">nuevo</span>
        </>
      }
      descripcion="Inicia sesión para seguir explorando las mejores ofertas de Amazon y Mercado Libre."
      beneficios={[
        { icono: ZapIcon, texto: "Ofertas actualizadas" },
        { icono: ShieldCheckIcon, texto: "Enlaces verificados" },
        { icono: HeartIcon, texto: "Guarda tus favoritos" },
      ]}
      imagen={{ src: "/img/auth/login.png", ancho: 224, alto: 295 }}
      accionCabecera={{ texto: "Regístrate", a: "/registro" }}
      tituloTarjeta="Iniciar sesión"
      subtituloTarjeta="Bienvenido a OfertasAlDia"
    >
      <Form method="post" noValidate className="flex flex-col gap-4">
        {params.get("restablecida") ? (
          <Alert variant="success" role="status">
            <AlertDescription>Tu contraseña se actualizó. Ya puedes iniciar sesión.</AlertDescription>
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
          error={errores.correo}
        />
        <CampoContrasena
          id="contrasena"
          name="contrasena"
          etiqueta="Contraseña"
          icono={LockIcon}
          placeholder="Tu contraseña"
          autoComplete="current-password"
          maxLength={limites.contrasena}
          error={errores.contrasena}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
            <Checkbox name="recordarme" defaultChecked />
            Recordarme
          </label>
          <Link to="/recuperar" className="inline-flex min-h-11 items-center text-xs font-medium text-primary">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" size="lg" disabled={enviando} className="w-full">
          {enviando ? "Entrando…" : "Iniciar sesión"}
        </Button>
        <BotonesSociales texto="O continúa con" />
        <p className="m-0 text-center text-sm">
          ¿No tienes una cuenta?{" "}
          <Link to="/registro" className="font-medium text-primary">
            Regístrate
          </Link>
        </p>
      </Form>
    </AuthLayout>
  );
}
