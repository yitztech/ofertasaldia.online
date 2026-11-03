import { Link } from "react-router";
import type { Route } from "./+types/terminos";
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
    { title: "Términos y Condiciones · OfertasAlDia" },
    {
      name: "description",
      content:
        "Condiciones de uso, divulgación de comisiones de afiliados (Amazon y Mercado Libre) y reglas para creadores en OfertasAlDia.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await obtenerUsuario(request);
  return { usuario };
}

export default function TerminosRuta({ loaderData }: Route.ComponentProps) {
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
              <BreadcrumbPage>Términos y Condiciones</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <article className="mx-auto flex w-full max-w-[68ch] flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-tarjeta sm:p-10">
          <header className="flex flex-col gap-2 border-b border-border pb-5">
            <h1 className="m-0 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Términos y Condiciones de Uso
            </h1>
            <p className="m-0 text-sm text-muted-foreground cifras">
              Última actualización: 3 de noviembre de 2026 · Jurisdicción: Estados Unidos Mexicanos
            </p>
          </header>

          <section aria-labelledby="sec-naturaleza" className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
            <h2 id="sec-naturaleza" className="m-0 text-xl font-bold tracking-tight">
              1. Naturaleza del servicio y divulgación de afiliados
            </h2>
            <p className="m-0 text-muted-foreground">
              OfertasAlDia (<strong>ofertasaldia.online</strong>) es un catálogo independiente de descubrimiento de descuentos y vitrinas para creadores de contenido en México. No vendemos productos directamente ni procesamos pagos de mercancías: toda compra se realiza directamente en las plataformas oficiales de <strong>Amazon México</strong> o <strong>Mercado Libre México</strong>.
            </p>
            <p className="m-0 text-muted-foreground">
              En cumplimiento con los lineamientos de transparencia publicitaria de la PROFECO y las políticas del Programa de Afiliados de Amazon y del Programa de Afiliados de Mercado Libre, te informamos que los enlaces de salida (identificados bajo la ruta <code>/ir/:id</code> y con el atributo <code>rel=&quot;sponsored&quot;</code>) son enlaces de afiliado. Si decides comprar un producto tras seguir uno de estos enlaces, el creador que compartió la recomendación o la plataforma pueden recibir una comisión sin que esto represente ningún costo adicional para ti.
            </p>
          </section>

          <section aria-labelledby="sec-precios" className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
            <h2 id="sec-precios" className="m-0 text-xl font-bold tracking-tight">
              2. Verificación de precios e historial de 90 días
            </h2>
            <p className="m-0 text-muted-foreground">
              Nuestro sistema consulta periódicamente la disponibilidad y el precio de los artículos publicados en pesos mexicanos (MXN) y registra su evolución durante los últimos 90 días para ayudarte a distinguir descuentos reales de precios inflados. No obstante, las tiendas pueden modificar sus precios, cupones o existencias en cualquier momento. El precio final aplicable será siempre el que muestre la tienda oficial en el momento de completar tu compra.
            </p>
          </section>

          <section aria-labelledby="sec-cuentas" className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
            <h2 id="sec-cuentas" className="m-0 text-xl font-bold tracking-tight">
              3. Cuentas de usuario y vitrinas de creadores
            </h2>
            <p className="m-0 text-muted-foreground">
              Al registrarte en OfertasAlDia te comprometes a proporcionar información veraz y a mantener la confidencialidad de tu contraseña. Los creadores que publican vitrinas bajo <code>/c/:alias</code> o reseñas en el blog son responsables de que sus recomendaciones sean honestas y no induzcan a error sobre las características técnicas del producto.
            </p>
            <p className="m-0 text-muted-foreground">
              Queda prohibido publicar enlaces hacia sitios fraudulentos, artículos falsificados, productos prohibidos por la legislación mexicana o manipular artificialmente el conteo de clics mediante sistemas automatizados (bots).
            </p>
          </section>

          <section aria-labelledby="sec-planes" className="flex flex-col gap-3 text-base leading-relaxed text-foreground">
            <h2 id="sec-planes" className="m-0 text-xl font-bold tracking-tight">
              4. Suscripción al Plan Creador Pro
            </h2>
            <p className="m-0 text-muted-foreground">
              El uso del catálogo público, el buscador avanzado y el guardado de favoritos es gratuito. Los creadores que contraten el <strong>Plan Creador Pro</strong> ($299 MXN mensuales) acceden a publicación de reseñas editoriales, productos ilimitados en su vitrina y analítica detallada de conversión. Puedes cancelar la renovación de tu suscripción en cualquier momento desde tu panel sin penalizaciones.
            </p>
          </section>

          <footer className="border-t border-border pt-5 text-sm text-muted-foreground">
            ¿Tienes dudas sobre estas condiciones? Consulta también nuestro{" "}
            <Link to="/privacidad" className="font-semibold text-primary underline">
              Aviso de Privacidad
            </Link>{" "}
            o regresa al{" "}
            <Link to="/buscar" className="font-semibold text-primary underline">
              buscador de ofertas
            </Link>
            .
          </footer>
        </article>
      </main>

      <Pie />
    </>
  );
}
