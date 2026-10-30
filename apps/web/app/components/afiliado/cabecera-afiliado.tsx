import { CheckIcon, CrownIcon, InfoIcon, LinkIcon, StarIcon, UserPlusIcon, EllipsisIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { InstagramIcono, TikTokIcono, YouTubeIcono } from "~/components/comun/iconos-marca";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "~/components/ui/breadcrumb";
import { Button } from "~/components/ui/button";
import type { Afiliado, RedSocial } from "~/datos/tipos";
import { cn } from "~/utils";
import { formatearValoracion } from "~/lib/formato";

const iconosRedes: Record<RedSocial, { icono: ReactNode; nombre: string }> = {
  youtube: { icono: <YouTubeIcono className="size-5" />, nombre: "YouTube" },
  instagram: { icono: <InstagramIcono className="size-5" />, nombre: "Instagram" },
  tiktok: { icono: <TikTokIcono className="size-5" />, nombre: "TikTok" },
  enlace: { icono: <LinkIcon aria-hidden="true" className="size-5" />, nombre: "Enlace del perfil" },
};

export function SelloVerificado() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violeta-suave px-2.5 py-1 text-xs font-semibold text-primary">
      <span aria-hidden="true" className="grid size-4 place-items-center rounded-[0.3rem] bg-primary text-primary-foreground">
        <CheckIcon className="size-3" strokeWidth={3.5} />
      </span>
      Afiliado verificado
      <InfoIcon aria-hidden="true" className="size-3.5" />
    </span>
  );
}

function EstadisticasPerfil({ afiliado }: { afiliado: Afiliado }) {
  const e = afiliado.estadisticas;
  const items = [
    { valor: e.seguidores, etiqueta: "Seguidores" },
    { valor: String(e.productos), etiqueta: "Productos" },
    { valor: String(e.colecciones), etiqueta: "Colecciones" },
    { valor: formatearValoracion(e.valoracion), etiqueta: "Valoración", estrella: true },
  ];
  return (
    <dl className="m-0 grid grid-cols-4 divide-x divide-border rounded-2xl bg-card/95 py-3 shadow-tarjeta">
      {items.map((i) => (
        <div key={i.etiqueta} className="flex flex-col-reverse items-center px-2 text-center sm:px-5">
          <dt className="text-[0.6875rem] text-muted-foreground sm:text-xs">{i.etiqueta}</dt>
          <dd className="m-0 inline-flex items-center gap-1 text-lg font-extrabold leading-6 cifras sm:text-2xl sm:leading-8">
            {i.estrella ? <StarIcon aria-hidden="true" className="size-4 fill-estrella text-estrella sm:size-5" /> : null}
            {i.valor}
          </dd>
        </div>
      ))}
    </dl>
  );
}

interface CabeceraAfiliadoProps {
  afiliado: Afiliado;
  variante: "panel" | "publico";
}

/** Portada del perfil: la misma en el panel privado y en la página pública. */
export function CabeceraAfiliado({ afiliado, variante }: CabeceraAfiliadoProps) {
  const [siguiendo, setSiguiendo] = useState(false);
  const publico = variante === "publico";
  return (
    <section aria-labelledby="titulo-afiliado" className="relative isolate overflow-hidden rounded-3xl bg-hero">
      <img
        src="/img/afiliado/portada.png"
        alt=""
        width={610}
        height={135}
        className={cn("desvanecer-esquina absolute right-0 top-0 -z-10 hidden h-[78%] object-cover object-left-top md:block", publico ? "w-[58%]" : "w-[46%]")}
      />
      <div className="flex flex-col gap-4 p-5 sm:p-7">
        {publico ? (
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Inicio</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>Afiliados</BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{afiliado.nombre}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
          <div className="relative shrink-0 self-start">
            <img
              src={afiliado.avatar}
              alt={`Foto de ${afiliado.nombre}`}
              width={140}
              height={140}
              className="size-28 rounded-full border-4 border-card object-cover shadow-tarjeta sm:size-36"
            />
            {!publico ? (
              <span aria-hidden="true" className="absolute bottom-1 right-1 grid size-8 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground">
                <CrownIcon className="size-4 fill-current" />
              </span>
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 id="titulo-afiliado" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {afiliado.nombre}
              </h1>
              {afiliado.verificado ? <SelloVerificado /> : null}
            </div>
            <p className="m-0 text-sm text-muted-foreground">@{afiliado.alias}</p>
            <p className="m-0 max-w-[58ch] text-sm leading-6 sm:text-[0.9375rem]">{afiliado.descripcion}</p>
            <ul className="m-0 mt-1 flex list-none gap-2 p-0">
              {afiliado.redes.map((r) => (
                <li key={r.red}>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${iconosRedes[r.red].nombre} de ${afiliado.nombre} (se abre en una pestaña nueva)`}
                    className="grid size-10 place-items-center rounded-full bg-card/80 text-foreground shadow-tarjeta hover:text-primary"
                  >
                    {iconosRedes[r.red].icono}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          {publico ? (
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button
                variant={siguiendo ? "suave" : "default"}
                aria-pressed={siguiendo}
                onClick={() => setSiguiendo((v) => !v)}
                className="rounded-xl px-6"
              >
                <UserPlusIcon aria-hidden="true" />
                {siguiendo ? "Siguiendo" : "Seguir"}
              </Button>
              <Button variant="outline" size="icon" aria-label="Más opciones" className="bg-card/80">
                <EllipsisIcon aria-hidden="true" />
              </Button>
            </div>
          ) : null}
        </div>
        <div className="md:ml-auto md:w-[26rem] md:max-w-full">
          <EstadisticasPerfil afiliado={afiliado} />
        </div>
      </div>
    </section>
  );
}
