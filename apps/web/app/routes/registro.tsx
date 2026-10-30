import { useState } from "react";
import { BookmarkIcon, BellIcon, ChartColumnIcon, LockIcon, MailIcon, UserIcon, UsersIcon } from "lucide-react";
import { Form, Link, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/registro";
import { AuthLayout } from "~/components/auth/auth-layout";
import { BotonesSociales } from "~/components/auth/botones-sociales";
import { CampoContrasena, CampoTexto } from "~/components/auth/campos";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { limites } from "~/lib/limites";
import {
  aError,
  limpiarNombre,
  recolectar,
  validarContrasenaNueva,
  validarCorreo,
  validarNombre,
} from "~/lib/validacion";

export function meta() {
  return [{ title: "Crear cuenta · OfertasAlDia" }];
}

export async function action({ request }: Route.ActionArgs) {
  const datos = await request.formData();
  const nombre = String(datos.get("nombre") ?? "");
  const correo = String(datos.get("correo") ?? "");
  const contrasena = String(datos.get("contrasena") ?? "");
  const terminos = datos.get("terminos") === "on";
  const errores = recolectar(
    aError("nombre", validarNombre(nombre)),
    aError("correo", validarCorreo(correo)),
    aError("contrasena", validarContrasenaNueva(contrasena)),
    aError("terminos", terminos ? null : "Debes aceptar los términos para continuar."),
  );
  if (Object.keys(errores).length) return { errores, nombre, correo };
  // Sin backend todavía: el alta simulada lleva al panel.
  return redirect("/panel");
}

export default function Registro() {
  const resultado = useActionData<typeof action>();
  const enviando = useNavigation().state === "submitting";
  const [avisoNombre, setAvisoNombre] = useState(false);
  const errores = resultado?.errores ?? {};
  return (
    <AuthLayout
      eyebrow="Únete a nuestra comunidad"
      titulo={
        <>
          Crea tu cuenta<span className="texto-marca block">en OfertasAlDia</span>
        </>
      }
      descripcion="Descubre, guarda y comparte las mejores oportunidades de Amazon y Mercado Libre."
      beneficios={[
        { icono: BookmarkIcon, texto: "Guarda tus productos favoritos" },
        { icono: BellIcon, texto: "Recibe alertas de precio" },
        { icono: UsersIcon, texto: "Sigue a otros afiliados" },
        { icono: ChartColumnIcon, texto: "Crea tus propias colecciones" },
      ]}
      imagen={{ src: "/img/auth/registro.png", ancho: 182, alto: 285 }}
      accionCabecera={{ texto: "Iniciar sesión", a: "/entrar" }}
      tituloTarjeta="Crear cuenta"
      subtituloTarjeta="Es rápido y gratuito"
    >
      <Form method="post" noValidate className="flex flex-col gap-4">
        <CampoTexto
          id="nombre"
          name="nombre"
          etiqueta="Nombre completo"
          icono={UserIcon}
          placeholder="Tu nombre"
          autoComplete="name"
          maxLength={limites.nombreCompleto}
          defaultValue={resultado?.nombre}
          error={errores.nombre}
          ayuda={avisoNombre ? "Solo se aceptan letras, espacios, apóstrofo, guion y punto." : undefined}
          onChange={(e) => {
            const limpio = limpiarNombre(e.target.value);
            setAvisoNombre(limpio !== e.target.value);
            e.target.value = limpio;
          }}
        />
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
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          maxLength={limites.contrasena}
          error={errores.contrasena}
        />
        <div className="flex flex-col gap-1">
          <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-5">
            <Checkbox name="terminos" aria-invalid={errores.terminos ? true : undefined} aria-describedby={errores.terminos ? "terminos-error" : undefined} className="mt-0.5" />
            <span>
              Acepto los{" "}
              <Link to="/terminos" className="text-primary">
                Términos y Condiciones
              </Link>{" "}
              y la{" "}
              <Link to="/privacidad" className="text-primary">
                Política de Privacidad
              </Link>
            </span>
          </label>
          {errores.terminos ? (
            <p id="terminos-error" role="alert" className="m-0 text-xs font-medium text-destructive">
              {errores.terminos}
            </p>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={enviando} className="w-full">
          {enviando ? "Creando cuenta…" : "Crear cuenta"}
        </Button>
        <BotonesSociales texto="O regístrate con" />
        <p className="m-0 text-center text-sm">
          ¿Ya tienes una cuenta?{" "}
          <Link to="/entrar" className="font-medium text-primary">
            Inicia sesión
          </Link>
        </p>
      </Form>
    </AuthLayout>
  );
}
