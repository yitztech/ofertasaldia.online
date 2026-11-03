import { SearchIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/buscar";
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
import { RejillaOfertas } from "~/components/ofertas/rejilla-ofertas";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect } from "~/components/ui/select";
import type { CategoriaId, PlataformaId } from "~/datos/tipos";
import { formatearMxn } from "~/lib/formato";
import { limites } from "~/lib/limites";
import { urlOferta } from "~/lib/slug";
import { obtenerUsuario } from "~/servicios/auth.server";
import { catalogo } from "~/servicios/catalogo";

type OrdenBusqueda =
  | "descuento"
  | "recientes"
  | "precio-asc"
  | "precio-desc"
  | "valoracion";

const ORDENES_VALIDOS: OrdenBusqueda[] = [
  "descuento",
  "recientes",
  "precio-asc",
  "precio-desc",
  "valoracion",
];

export function meta({ loaderData }: Route.MetaArgs) {
  const q = loaderData?.filtros?.q;
  return [
    {
      title: q
        ? `Buscar “${q}” · Buscador avanzado de OfertasAlDia`
        : "Buscador avanzado de ofertas · OfertasAlDia",
    },
    {
      name: "description",
      content:
        "Filtra ofertas verificadas de Amazon y Mercado Libre por descuento mínimo, rango de precio, tienda y categoría.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, limites.busqueda);
  const categorias = await catalogo.categorias();

  const catParam = url.searchParams.get("categoria") ?? "todas";
  const categoria = (categorias.find((c) => c.id === catParam)?.id ??
    "todas") as CategoriaId;

  const platParam = url.searchParams.get("plataforma");
  const plataforma: PlataformaId | undefined =
    platParam === "amazon" || platParam === "mercadolibre"
      ? platParam
      : undefined;

  const descParam = Number(url.searchParams.get("descuento") ?? "0");
  const minDiscount =
    Number.isInteger(descParam) && descParam > 0 && descParam <= 90
      ? descParam
      : 0;

  const maxPrecioPesos = Number(url.searchParams.get("maxPrecio") ?? "0");
  const maxPriceCents =
    Number.isInteger(maxPrecioPesos) && maxPrecioPesos > 0
      ? maxPrecioPesos * 100
      : undefined;

  const dispParam = url.searchParams.get("disponibilidad") ?? "active";
  const disponibilidad = dispParam === "todas" ? "todas" : "active";

  const ordenParam = url.searchParams.get("orden") as OrdenBusqueda | null;
  const orden: OrdenBusqueda =
    ordenParam && ORDENES_VALIDOS.includes(ordenParam)
      ? ordenParam
      : "descuento";

  const [usuario, ofertas, sugerencias] = await Promise.all([
    obtenerUsuario(request),
    catalogo.buscarAvanzado({
      q,
      categoria,
      plataforma,
      minDiscount: minDiscount || undefined,
      maxPriceCents,
      estado: disponibilidad === "active" ? "active" : undefined,
      orden,
    }),
    catalogo.sugerencias(q),
  ]);

  return {
    usuario,
    categorias,
    ofertas,
    sugerencias,
    filtros: {
      q,
      categoria,
      plataforma: plataforma ?? "",
      minDiscount,
      maxPrecio: maxPrecioPesos > 0 ? String(maxPrecioPesos) : "",
      disponibilidad,
      orden,
    },
  };
}

export default function BuscarRuta({ loaderData }: Route.ComponentProps) {
  const { usuario, categorias, ofertas, sugerencias, filtros } = loaderData;
  const navigation = useNavigation();
  const cargando = navigation.state === "loading";

  const hayFiltrosActivos =
    Boolean(filtros.q) ||
    filtros.categoria !== "todas" ||
    Boolean(filtros.plataforma) ||
    filtros.minDiscount > 0 ||
    Boolean(filtros.maxPrecio);

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

      <main id="contenido" className="contenedor flex flex-col gap-6 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Buscador avanzado de ofertas
          </h1>
          <p className="m-0 text-sm text-muted-foreground">
            Explora descuentos verificados de nuestra comunidad en Amazon y Mercado Libre.
          </p>
        </div>

        {/* Formulario GET semántico con <fieldset> y <datalist> */}
        <Form
          method="get"
          action="/buscar"
          role="search"
          className="rounded-2xl border border-border bg-card p-5 shadow-tarjeta sm:p-6"
        >
          <fieldset className="m-0 flex flex-col gap-5 border-0 p-0">
            <legend className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
              <SlidersHorizontalIcon aria-hidden="true" className="size-4 text-primary" />
              Parámetros de búsqueda y filtrado
            </legend>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Label htmlFor="busqueda-avanzada-q" className="sr-only">
                  Palabra clave, producto o marca
                </Label>
                <SearchIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="busqueda-avanzada-q"
                  name="q"
                  type="search"
                  list="sugerencias-buscador-avanzado"
                  defaultValue={filtros.q}
                  maxLength={limites.busqueda}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  placeholder="Ej. Sony WH-1000XM5, Samsung, freidora, monitor..."
                  className="min-h-11 pl-10"
                />
                <datalist id="sugerencias-buscador-avanzado">
                  {sugerencias.map((s) => (
                    <option key={s.id} value={s.titulo}>
                      {s.categoriaNombre} · {formatearMxn(s.precioCentavos)}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="flex items-center gap-2">
                <Button type="submit" className="min-h-11 flex-1 px-6 sm:flex-none">
                  Aplicar filtros
                </Button>
                {hayFiltrosActivos ? (
                  <Button asChild variant="outline" className="min-h-11 gap-1.5">
                    <Link to="/buscar">
                      <XIcon aria-hidden="true" className="size-4" />
                      Limpiar
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filtro-categoria">Categoría</Label>
                <NativeSelect
                  id="filtro-categoria"
                  name="categoria"
                  defaultValue={filtros.categoria}
                  className="min-h-11"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filtro-plataforma">Tienda</Label>
                <NativeSelect
                  id="filtro-plataforma"
                  name="plataforma"
                  defaultValue={filtros.plataforma}
                  className="min-h-11"
                >
                  <option value="">Todas las tiendas</option>
                  <option value="mercadolibre">Mercado Libre</option>
                  <option value="amazon">Amazon México</option>
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filtro-disponibilidad">Disponibilidad</Label>
                <NativeSelect
                  id="filtro-disponibilidad"
                  name="disponibilidad"
                  defaultValue={filtros.disponibilidad}
                  className="min-h-11"
                >
                  <option value="active">En existencia (activas)</option>
                  <option value="todas">Incluir pausadas / agotadas</option>
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filtro-descuento">Descuento mínimo</Label>
                <NativeSelect
                  id="filtro-descuento"
                  name="descuento"
                  defaultValue={String(filtros.minDiscount)}
                  className="min-h-11 cifras"
                >
                  <option value="0">Cualquier descuento</option>
                  <option value="15">Desde 15% de ahorro</option>
                  <option value="25">Desde 25% de ahorro</option>
                  <option value="35">Desde 35% de ahorro</option>
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filtro-max-precio">Precio tope (MXN)</Label>
                <NativeSelect
                  id="filtro-max-precio"
                  name="maxPrecio"
                  defaultValue={filtros.maxPrecio}
                  className="min-h-11 cifras"
                >
                  <option value="">Sin límite de precio</option>
                  <option value="500">Hasta $500 MXN</option>
                  <option value="1500">Hasta $1,500 MXN</option>
                  <option value="3000">Hasta $3,000 MXN</option>
                  <option value="6000">Hasta $6,000 MXN</option>
                  <option value="15000">Hasta $15,000 MXN</option>
                </NativeSelect>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="filtro-orden">Ordenar por</Label>
                <NativeSelect
                  id="filtro-orden"
                  name="orden"
                  defaultValue={filtros.orden}
                  className="min-h-11"
                >
                  <option value="descuento">Mayor descuento</option>
                  <option value="recientes">Verificados recientemente</option>
                  <option value="precio-asc">Precio: menor a mayor</option>
                  <option value="precio-desc">Precio: mayor a menor</option>
                  <option value="valoracion">Mejor valorados</option>
                </NativeSelect>
              </div>
            </div>
          </fieldset>
        </Form>

        {/* Sugerencias rápidas de productos verificados */}
        {sugerencias.length > 0 ? (
          <nav aria-label="Sugerencias directas de productos" className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Accesos rápidos:
            </span>
            {sugerencias.slice(0, 5).map((s) => (
              <Link
                key={s.id}
                to={urlOferta({ id: s.id, nombre: s.titulo })}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-xs font-medium text-foreground no-underline transition-colors hover:border-primary hover:bg-acento hover:text-primary cifras"
              >
                <span className="line-clamp-1 max-w-[24ch]">{s.titulo}</span>
                {s.descuento ? (
                  <span className="font-bold text-descuento">-{s.descuento}%</span>
                ) : null}
              </Link>
            ))}
          </nav>
        ) : null}

        {/* Cabecera de resultados y rejilla */}
        <section aria-labelledby="titulo-resultados-busqueda" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="titulo-resultados-busqueda"
              className="m-0 text-xl font-extrabold tracking-tight text-foreground"
            >
              {filtros.q
                ? `Resultados para “${filtros.q}”`
                : "Catálogo de ofertas verificadas"}
            </h2>
            <p className="m-0 text-sm font-medium text-muted-foreground cifras">
              {ofertas.length}{" "}
              {ofertas.length === 1 ? "oferta encontrada" : "ofertas encontradas"}
            </p>
          </div>

          <div aria-busy={cargando}>
            <RejillaOfertas
              ofertas={ofertas}
              className="grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
              vacio={{
                titulo: "No encontramos ofertas con estos criterios",
                descripcion:
                  "Intenta ampliar el precio máximo, reducir el descuento mínimo o limpiar los filtros.",
                accion: { texto: "Restablecer filtros", a: "/buscar" },
              }}
            />
          </div>
        </section>
      </main>

      <Pie />
    </>
  );
}
