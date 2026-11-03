import { Link } from "react-router";
import type { Route } from "./+types/privacidad";
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
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { obtenerUsuario } from "~/servicios/auth.server";

export function meta() {
  return [
    { title: "Política y Aviso de Privacidad · OfertasAlDia" },
    {
      name: "description",
      content:
        "Aviso de privacidad conforme a la LFPDPPP: qué datos recabamos, uso de cookies de sesión seguras y ejercicio de derechos ARCO.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await obtenerUsuario(request);
  return { usuario };
}

export default function PrivacidadRuta({ loaderData }: Route.ComponentProps) {
  const { usuario } = loaderData;

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

      <main id="contenido" className="contenedor flex flex-col gap-6 py-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Inicio</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Política de Privacidad</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <article className="mx-auto flex w-full max-w-[68ch] flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-tarjeta sm:p-10">
          <header className="flex flex-col gap-2 border-b border-border pb-5">
            <h1 className="m-0 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Política y Aviso de Privacidad
            </h1>
            <p className="m-0 text-sm text-muted-foreground cifras">
              Última actualización: 3 de noviembre de 2026 · Cumplimiento LFPDPPP (México)
            </p>
          </header>

          <section aria-labelledby="priv-datos" className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
            <h2 id="priv-datos" className="m-0 text-xl font-bold tracking-tight">
              1. Datos personales que recabamos
            </h2>
            <p className="m-0 text-muted-foreground">
              En cumplimiento con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), te informamos que en OfertasAlDia recolectamos únicamente los datos mínimos indispensables para operar tu cuenta:
            </p>
            <ul className="m-0 flex flex-col gap-1.5 pl-5 text-muted-foreground">
              <li>
                <strong>Usuarios registrados:</strong> nombre visible, dirección de correo electrónico, hash criptográfico de contraseña y lista de ofertas guardadas en favoritos.
              </li>
              <li>
                <strong>Creadores y afiliados:</strong> alias público, biografía, ubicación opcional y enlaces a redes sociales que decidas mostrar en tu vitrina pública.
              </li>
              <li>
                <strong>Visitantes sin cuenta:</strong> puedes explorar ofertas, consultar el historial de precios de 90 días y acudir a las tiendas sin necesidad de registrarte.
              </li>
            </ul>
          </section>

          <section aria-labelledby="priv-clics" className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
            <h2 id="priv-clics" className="m-0 text-xl font-bold tracking-tight">
              2. Registro anónimo de clics de salida (/ir/:id)
            </h2>
            <p className="m-0 text-muted-foreground">
              Cuando sigues un enlace de oferta hacia Amazon o Mercado Libre, registramos únicamente el identificador del producto, la sección de origen (por ejemplo, portada, buscador o ficha), el alias del creador que recomendó la oferta y la fecha del evento para elaborar las estadísticas agregadas del creador. <strong>No almacenamos tu dirección IP ni creamos perfiles de rastreo publicitario entre sitios.</strong>
            </p>
          </section>

          <section aria-labelledby="priv-cookies" className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
            <h2 id="priv-cookies" className="m-0 text-xl font-bold tracking-tight">
              3. Cookies estrictamente necesarias y almacenamiento local
            </h2>
            <p className="m-0 text-muted-foreground">
              Utilizamos una única cookie técnica de sesión con atributos <code>HttpOnly</code>, <code>Secure</code> y <code>SameSite=Lax</code> para mantener tu sesión iniciada de forma segura. Si guardas ofertas en favoritos sin haber iniciado sesión, los identificadores se conservan localmente en tu propio navegador (<code>localStorage</code>) y nunca se comparten con terceros.
            </p>
          </section>

          <section aria-labelledby="priv-arco" className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
            <h2 id="priv-arco" className="m-0 text-xl font-bold tracking-tight">
              4. Derechos ARCO y conservación de datos
            </h2>
            <p className="m-0 text-muted-foreground">
              Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (derechos ARCO) al tratamiento de tus datos personales en cualquier momento. Desde tu panel puedes editar directamente tu nombre, alias y biografía. Los tokens temporales de verificación de correo y recuperación de contraseña se eliminan automáticamente una vez vencidos mediante procesos diarios de depuración.
            </p>
          </section>

          <footer className="border-t border-border pt-5 text-sm text-muted-foreground">
            Consulta también nuestros{" "}
            <Link to="/terminos" className="font-semibold text-primary underline">
              Términos y Condiciones de Uso
            </Link>{" "}
            o vuelve a la{" "}
            <Link to="/" className="font-semibold text-primary underline">
              página principal
            </Link>
            .
          </footer>
        </article>
      </main>

      <Pie />
    </>
  );
}
