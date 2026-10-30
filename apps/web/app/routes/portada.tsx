import { Suspense, useEffect } from "react";
import { ArrowRightIcon } from "lucide-react";
import { Await, Link, useNavigation } from "react-router";
import type { Route } from "./+types/portada";
import { EstadoError, TarjetasCargando } from "~/components/comun/estados";
import { Cabecera } from "~/components/layout/cabecera";
import {
  AvisosBoton,
  BotonesCuenta,
  EnlaceComoFunciona,
  EnlaceParaAfiliados,
  FavoritosBoton,
} from "~/components/layout/acciones-cabecera";
import { Pie } from "~/components/layout/pie";
import { BannerPlataforma } from "~/components/ofertas/banner-plataforma";
import { ChipsCategorias } from "~/components/ofertas/chips-categorias";
import { HeroMarketplace } from "~/components/ofertas/hero-marketplace";
import { ListaMasVendidos } from "~/components/ofertas/lista-mas-vendidos";
import { RejillaOfertas } from "~/components/ofertas/rejilla-ofertas";
import { TarjetaColeccion } from "~/components/ofertas/tarjeta-coleccion";
import type { CategoriaId, PlataformaId } from "~/datos/tipos";
import { limites } from "~/lib/limites";
import { catalogo } from "~/servicios/catalogo";

export function meta() {
  return [
    { title: "OfertasAlDia · Las mejores ofertas todos los días" },
    {
      name: "description",
      content:
        "Productos recomendados por nuestra comunidad de afiliados de Amazon y Mercado Libre, con enlaces verificados.",
    },
  ];
}

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").slice(0, limites.busqueda);
  const categorias = catalogo.categorias();
  const categoriaPedida = url.searchParams.get("categoria");
  const categoria = (categorias.find((c) => c.id === categoriaPedida)?.id ?? "todas") as CategoriaId;
  const plataformaPedida = url.searchParams.get("plataforma");
  const plataforma: PlataformaId | undefined =
    plataformaPedida === "amazon" || plataformaPedida === "mercadolibre" ? plataformaPedida : undefined;

  return {
    q,
    categoria,
    categorias,
    ofertas: catalogo.ofertasDestacadas(q, categoria, plataforma),
    colecciones: catalogo.coleccionesPopulares(),
    masVendidos: catalogo.masVendidos(),
  };
}

function EncabezadoSeccion({ id, titulo, subtitulo, enlace }: { id: string; titulo: string; subtitulo: string; enlace?: { a: string; texto: string } }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <h2 id={id} className="text-2xl font-extrabold tracking-tight">
          {titulo}
        </h2>
        <p className="m-0 text-sm text-muted-foreground">{subtitulo}</p>
      </div>
      {enlace ? (
        <Link to={enlace.a} className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary no-underline hover:underline">
          {enlace.texto}
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </div>
  );
}

export default function Portada({ loaderData }: Route.ComponentProps) {
  const { q, categoria, categorias, ofertas, colecciones, masVendidos } = loaderData;
  const navegacion = useNavigation();
  const buscando = Boolean(q) || categoria !== "todas";

  useEffect(() => {
    if (buscando) document.getElementById("ofertas")?.scrollIntoView({ behavior: "smooth" });
  }, [buscando, q, categoria]);

  return (
    <>
      <Cabecera
        acciones={
          <>
            <EnlaceComoFunciona />
            <EnlaceParaAfiliados />
            <FavoritosBoton />
            <AvisosBoton />
            <BotonesCuenta className="ml-1" />
          </>
        }
      />
      <main id="contenido" className="contenedor flex flex-col gap-8 pt-4">
        <div className="grid gap-4 lg:grid-cols-[1fr_17.5rem] xl:grid-cols-[1fr_19rem]">
          <HeroMarketplace busqueda={q} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <BannerPlataforma plataforma="amazon" />
            <BannerPlataforma plataforma="mercadolibre" />
          </div>
        </div>

        <ChipsCategorias categorias={categorias} activa={categoria} />

        <section id="ofertas" aria-labelledby="titulo-ofertas" className="scroll-mt-24">
          <EncabezadoSeccion
            id="titulo-ofertas"
            titulo={q ? `Resultados para “${q}”` : "Ofertas destacadas"}
            subtitulo="Productos recomendados por nuestra comunidad"
            enlace={{ a: "/#ofertas", texto: "Ver todas las ofertas" }}
          />
          <div aria-busy={navegacion.state === "loading"}>
            <Suspense fallback={<TarjetasCargando className="grid-cols-2 md:grid-cols-3 xl:grid-cols-6" />}>
              <Await resolve={ofertas} errorElement={<EstadoError />}>
                {(lista) => (
                  <RejillaOfertas
                    ofertas={lista}
                    className="grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
                    vacio={{
                      titulo: "No encontramos ofertas con esa búsqueda",
                      descripcion: "Prueba con otra palabra o explora todas las categorías.",
                      accion: { texto: "Ver todas las ofertas", a: "/#ofertas" },
                    }}
                  />
                )}
              </Await>
            </Suspense>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:gap-10">
          <section id="colecciones" aria-labelledby="titulo-colecciones" className="scroll-mt-24">
            <EncabezadoSeccion
              id="titulo-colecciones"
              titulo="Colecciones populares"
              subtitulo="Listas curadas por la comunidad"
              enlace={{ a: "/#colecciones", texto: "Ver todas las colecciones" }}
            />
            <Suspense fallback={<TarjetasCargando cantidad={5} className="grid-cols-2 md:grid-cols-5" />}>
              <Await resolve={colecciones} errorElement={<EstadoError />}>
                {(lista) => (
                  <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-3 xl:grid-cols-5">
                    {lista.map((c) => (
                      <li key={c.id}>
                        <TarjetaColeccion coleccion={c} />
                      </li>
                    ))}
                  </ul>
                )}
              </Await>
            </Suspense>
          </section>

          <section id="mas-vendidos" aria-labelledby="titulo-mas-vendidos" className="scroll-mt-24 lg:border-l lg:border-border lg:pl-8">
            <EncabezadoSeccion id="titulo-mas-vendidos" titulo="Los más vendidos" subtitulo="Productos que todos están comprando" />
            <Suspense fallback={<TarjetasCargando cantidad={1} />}>
              <Await resolve={masVendidos} errorElement={<EstadoError />}>
                {(lista) => <ListaMasVendidos productos={lista} />}
              </Await>
            </Suspense>
          </section>
        </div>
      </main>
      <Pie />
    </>
  );
}
