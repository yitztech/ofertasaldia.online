import { useMemo, useState } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { Suspense } from "react";
import { Await } from "react-router";
import type { Route } from "./+types/panel";
import { CabeceraAfiliado } from "~/components/afiliado/cabecera-afiliado";
import { Pestanas } from "~/components/afiliado/pestanas";
import { EstadoError, EstadoVacio, TarjetasCargando } from "~/components/comun/estados";
import { AvisosBoton, EnlaceParaAfiliados, MenuUsuario } from "~/components/layout/acciones-cabecera";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { BarraLateralPanel } from "~/components/panel/barra-lateral";
import { CategoriasPrincipales } from "~/components/panel/categorias-principales";
import { EnlaceAfiliado } from "~/components/panel/enlace-afiliado";
import { GraficaClics } from "~/components/panel/grafica-clics";
import { ResumenMes } from "~/components/panel/resumen-mes";
import { TarjetaProductoPanel } from "~/components/panel/tarjeta-producto-panel";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { NativeSelect } from "~/components/ui/select";
import { urlPerfil } from "~/config";
import { categorias } from "~/datos/categorias";
import type { CategoriaId, EstadoProducto, ProductoPanel } from "~/datos/tipos";
import { limites } from "~/lib/limites";
import { buscarOfertas, ordenarOfertas, type Orden } from "~/lib/ofertas";
import { panel } from "~/servicios/catalogo";
import { cn } from "~/utils";

export function meta() {
  return [{ title: "Mi perfil · Panel de OfertasAlDia" }];
}

export function loader() {
  return {
    afiliado: panel.afiliado(),
    conteos: panel.conteos(),
    resumen: panel.resumen(),
    clics: panel.clics(),
    categoriasPrincipales: panel.categoriasPrincipales(),
    productos: panel.productos(),
  };
}

type FiltroEstado = "todos" | EstadoProducto;

const pestanas = [
  { id: "productos", etiqueta: "Productos" },
  { id: "colecciones", etiqueta: "Colecciones" },
  { id: "estadisticas", etiqueta: "Estadísticas" },
  { id: "guardados", etiqueta: "Guardados" },
  { id: "sobre-mi", etiqueta: "Sobre mí" },
];

function ListaProductos({ productos, conteos }: { productos: ProductoPanel[]; conteos: { todos: number; activos: number; pendientes: number; sinStock: number } }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [orden, setOrden] = useState<Orden>("recientes");
  const [categoria, setCategoria] = useState<CategoriaId>("todas");

  const filtros: { id: FiltroEstado; etiqueta: string }[] = [
    { id: "todos", etiqueta: `Todos (${conteos.todos})` },
    { id: "activo", etiqueta: `Activos (${conteos.activos})` },
    { id: "pendiente", etiqueta: `Pendientes (${conteos.pendientes})` },
    { id: "sin-stock", etiqueta: `Sin stock (${conteos.sinStock})` },
  ];

  const visibles = useMemo(() => {
    const porTexto = buscarOfertas(productos, texto, categoria);
    return ordenarOfertas(
      porTexto.filter((p) => estado === "todos" || p.estado === estado),
      orden,
    );
  }, [productos, texto, categoria, estado, orden]);

  return (
    <section aria-labelledby="titulo-mis-productos" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h2 id="titulo-mis-productos" className="text-2xl font-extrabold tracking-tight">
            Mis productos
          </h2>
          <p className="m-0 text-sm text-muted-foreground">Productos que has compartido como afiliado</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-none">
            <label htmlFor="buscar-productos" className="sr-only">
              Buscar en mis productos
            </label>
            <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-[1.125rem] -translate-y-1/2" />
            <Input
              id="buscar-productos"
              type="search"
              value={texto}
              maxLength={limites.busqueda}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar en mis productos..."
              className="pl-10"
            />
          </div>
          <Button variant="violeta" className="px-5">
            <PlusIcon aria-hidden="true" />
            Agregar producto
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="group" aria-label="Estado" className="flex flex-wrap gap-2">
          {filtros.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={estado === f.id}
              onClick={() => setEstado(f.id)}
              className={cn(
                "min-h-11 cursor-pointer rounded-xl border px-4 text-sm font-medium transition-colors",
                estado === f.id ? "border-primary bg-acento text-primary" : "border-border bg-card text-foreground hover:bg-acento",
              )}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
          <div className="flex flex-col gap-1">
            <label htmlFor="orden-productos" className="text-xs text-muted-foreground">
              Ordenar por
            </label>
            <NativeSelect id="orden-productos" value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
              <option value="recientes">Más recientes</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="valoracion">Mejor valorados</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="categoria-productos" className="text-xs text-muted-foreground">
              Filtrar por
            </label>
            <NativeSelect id="categoria-productos" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaId)}>
              <option value="todas">Todas las categorías</option>
              {categorias
                .filter((c) => c.id !== "todas")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </NativeSelect>
          </div>
        </div>
      </div>

      {visibles.length ? (
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 md:grid-cols-3 2xl:grid-cols-4">
          {visibles.map((p) => (
            <li key={p.id} className="flex">
              <div className="w-full">
                <TarjetaProductoPanel producto={p} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EstadoVacio titulo="No hay productos con estos filtros" descripcion="Cambia la búsqueda o el estado para ver tus recomendaciones." />
      )}
    </section>
  );
}

export default function Panel({ loaderData }: Route.ComponentProps) {
  const { afiliado, conteos, resumen, clics, categoriasPrincipales, productos } = loaderData;
  const [pestana, setPestana] = useState("productos");
  return (
    <>
      <Cabecera
        acciones={
          <>
            <EnlaceParaAfiliados />
            <AvisosBoton />
            <MenuUsuario nombre={afiliado.nombre} avatar={afiliado.avatar} />
          </>
        }
      />
      <main id="contenido" className="contenedor grid gap-4 py-4 lg:grid-cols-[14rem_1fr] lg:gap-6">
        <BarraLateralPanel />
        <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_22rem]">
          <div className="flex min-w-0 flex-col gap-6">
            <CabeceraAfiliado afiliado={afiliado} variante="panel" />
            <Pestanas pestanas={pestanas} activa={pestana} onCambiar={setPestana} etiqueta="Secciones de tu perfil">
              {pestana === "productos" ? (
                <Suspense fallback={<TarjetasCargando cantidad={4} className="grid-cols-2 md:grid-cols-3 2xl:grid-cols-4" />}>
                  <Await resolve={productos} errorElement={<EstadoError />}>
                    {(lista) => <ListaProductos productos={lista} conteos={conteos} />}
                  </Await>
                </Suspense>
              ) : (
                <EstadoVacio titulo="Esta sección llegará pronto" descripcion="Aún no tiene contenido. Mientras tanto, revisa tus productos." />
              )}
            </Pestanas>
          </div>
          <aside aria-label="Resumen" className="flex min-w-0 flex-col gap-4 xl:pt-0">
            <EnlaceAfiliado url={urlPerfil(afiliado.alias)} />
            <ResumenMes resumen={resumen} />
            <GraficaClics serie={clics} />
            <CategoriasPrincipales categorias={categoriasPrincipales} />
          </aside>
        </div>
      </main>
      <Pie />
    </>
  );
}

