import { Suspense, useMemo, useState } from "react";
import { ChevronDownIcon, SlidersHorizontalIcon } from "lucide-react";
import { Await } from "react-router";
import type { Route } from "./+types/afiliado";
import { CabeceraAfiliado } from "~/components/afiliado/cabecera-afiliado";
import { FiltrosDelPerfil } from "~/components/afiliado/filtros-perfil";
import { Pestanas } from "~/components/afiliado/pestanas";
import { ColeccionesDelAfiliado, LlamadaSeguir, SobreAfiliado } from "~/components/afiliado/tarjetas-laterales";
import { EstadoError, TarjetasCargando } from "~/components/comun/estados";
import { BotonesCuenta, CarritoBoton, EnlaceParaAfiliados, FavoritosBoton } from "~/components/layout/acciones-cabecera";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { RejillaOfertas } from "~/components/ofertas/rejilla-ofertas";
import { TarjetaColeccion } from "~/components/ofertas/tarjeta-coleccion";
import { Button } from "~/components/ui/button";
import { NativeSelect } from "~/components/ui/select";
import type { Afiliado, Oferta } from "~/datos/tipos";
import { filtrarPerfil, filtrosIniciales, type Orden } from "~/lib/ofertas";
import { afiliados } from "~/servicios/catalogo";

export async function loader({ params }: Route.LoaderArgs) {
  const perfil = await afiliados.porAlias(params.alias);
  if (!perfil) throw new Response("Afiliado no encontrado", { status: 404 });
  return { afiliado: perfil.afiliado, ofertas: Promise.resolve(perfil.ofertas), colecciones: perfil.colecciones };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const nombre = loaderData?.afiliado.nombre ?? "Afiliado";
  return [
    { title: `${nombre} · Ofertas recomendadas · OfertasAlDia` },
    { name: "description", content: loaderData?.afiliado.descripcion ?? "" },
  ];
}

const pestanas = (nombre: string) => [
  { id: "productos", etiqueta: "Productos" },
  { id: "colecciones", etiqueta: "Colecciones" },
  { id: "sobre", etiqueta: `Sobre ${nombre.split(" ")[0]}` },
];

function Productos({ afiliado, ofertas }: { afiliado: Afiliado; ofertas: Oferta[] }) {
  const [filtros, setFiltros] = useState({ ...filtrosIniciales, valoracionMinima: 4 });
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const visibles = useMemo(() => filtrarPerfil(ofertas, filtros), [ofertas, filtros]);
  return (
    <div className="grid gap-5 lg:grid-cols-[14.5rem_1fr]">
      <div>
        <Button
          variant="outline"
          className="mb-3 w-full lg:hidden"
          aria-expanded={filtrosAbiertos}
          aria-controls="filtros-perfil"
          onClick={() => setFiltrosAbiertos((v) => !v)}
        >
          <SlidersHorizontalIcon aria-hidden="true" />
          Filtros
          <ChevronDownIcon aria-hidden="true" className="ml-auto" />
        </Button>
        <div id="filtros-perfil" className={filtrosAbiertos ? "block" : "hidden lg:block"}>
          <FiltrosDelPerfil afiliado={afiliado} filtros={filtros} onCambiar={setFiltros} />
        </div>
      </div>
      <section aria-labelledby="titulo-productos-afiliado" className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="titulo-productos-afiliado" className="text-2xl font-extrabold tracking-tight">
              Productos de {afiliado.nombre}
            </h2>
            <p className="m-0 text-sm text-muted-foreground" role="status">
              {afiliado.estadisticas.productos} productos recomendados
              {visibles.length !== ofertas.length ? ` · ${visibles.length} con tus filtros` : ""}
            </p>
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="orden-afiliado" className="sr-only">
              Ordenar productos
            </label>
            <NativeSelect
              id="orden-afiliado"
              value={filtros.orden}
              onChange={(e) => setFiltros({ ...filtros, orden: e.target.value as Orden })}
            >
              <option value="recientes">Más recientes</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="valoracion">Mejor valorados</option>
            </NativeSelect>
          </div>
        </div>
        <RejillaOfertas
          ofertas={visibles}
          boton="violeta"
          className="grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
          vacio={{
            titulo: "Ningún producto coincide con los filtros",
            descripcion: "Quita algún filtro para ver más recomendaciones.",
          }}
        />
      </section>
    </div>
  );
}

export default function PaginaAfiliado({ loaderData }: Route.ComponentProps) {
  const { afiliado, ofertas, colecciones } = loaderData;
  const [pestana, setPestana] = useState("productos");
  const primerNombre = afiliado.nombre;
  return (
    <>
      <Cabecera
        acciones={
          <>
            <EnlaceParaAfiliados />
            <FavoritosBoton />
            <CarritoBoton />
            <BotonesCuenta className="ml-1" />
          </>
        }
      />
      <main id="contenido" className="contenedor flex flex-col gap-5 py-4">
        <CabeceraAfiliado afiliado={afiliado} variante="publico" />
        <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
          <Pestanas pestanas={pestanas(afiliado.nombre)} activa={pestana} onCambiar={setPestana} etiqueta={`Secciones de ${primerNombre}`}>
            {pestana === "productos" ? (
              <Suspense fallback={<TarjetasCargando className="grid-cols-2 md:grid-cols-3 xl:grid-cols-4" />}>
                <Await resolve={ofertas} errorElement={<EstadoError />}>
                  {(lista) => <Productos afiliado={afiliado} ofertas={lista} />}
                </Await>
              </Suspense>
            ) : null}
            {pestana === "colecciones" ? (
              <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 md:grid-cols-4">
                {colecciones.map((c) => (
                  <li key={c.id}>
                    <TarjetaColeccion coleccion={c} />
                  </li>
                ))}
              </ul>
            ) : null}
            {pestana === "sobre" ? <SobreAfiliado afiliado={afiliado} /> : null}
          </Pestanas>
          <aside aria-label={`Más sobre ${primerNombre}`} className="flex flex-col gap-4 xl:pt-[3.75rem]">
            <SobreAfiliado afiliado={afiliado} />
            <ColeccionesDelAfiliado nombre={afiliado.nombre} colecciones={colecciones} />
            <LlamadaSeguir nombre={afiliado.nombre} />
          </aside>
        </div>
      </main>
      <Pie />
    </>
  );
}
