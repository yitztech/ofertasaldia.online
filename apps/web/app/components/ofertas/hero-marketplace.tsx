import { BellIcon, ShieldCheckIcon, UsersIcon, ZapIcon } from "lucide-react";
import { Buscador } from "~/components/layout/buscador";

const garantias = [
  { icono: ZapIcon, texto: "Ofertas reales" },
  { icono: ShieldCheckIcon, texto: "Enlaces verificados" },
  { icono: UsersIcon, texto: "Comunidad de afiliados" },
  { icono: BellIcon, texto: "Alertas de precio" },
];

export function HeroMarketplace({ busqueda }: { busqueda: string }) {
  return (
    <section
      aria-labelledby="titulo-hero"
      className="relative isolate flex h-full flex-col overflow-hidden rounded-3xl bg-hero"
    >
      <img
        src="/img/banners/hero.png"
        alt=""
        width={553}
        height={325}
        className="desvanecer-izquierda absolute inset-y-0 right-0 -z-10 hidden h-full w-[60%] object-cover object-right md:block"
      />
      <div className="flex flex-col gap-4 p-5 sm:p-8 md:max-w-[62%] lg:p-10">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-primary">Descubre · Compara · Ahorra</p>
        <h1
          id="titulo-hero"
          className="text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-0.03em]"
        >
          Las mejores ofertas
          <span className="texto-marca block">todos los días</span>
        </h1>
        <p className="m-0 max-w-[40ch] text-base text-foreground sm:text-lg">
          Productos recomendados por nuestra comunidad de afiliados de Amazon y Mercado Libre.
        </p>
        <ul id="como-funciona" className="m-0 flex scroll-mt-24 list-none flex-wrap gap-x-5 gap-y-2 p-0 text-xs font-medium">
          {garantias.map(({ icono: Icono, texto }) => (
            <li key={texto} className="inline-flex items-center gap-1.5">
              <Icono aria-hidden="true" className="size-4 text-primary" fill={texto === "Ofertas reales" ? "currentColor" : "none"} />
              {texto}
            </li>
          ))}
        </ul>
        <Buscador
          id="buscar-hero"
          valorInicial={busqueda}
          conBoton
          className="mt-1 max-w-[34rem] rounded-full bg-card p-1 shadow-tarjeta [&>input]:min-h-12 [&>input]:bg-card"
        />
      </div>
      <img
        src="/img/banners/hero.png"
        alt=""
        width={553}
        height={325}
        className="mt-2 h-48 w-full object-cover object-right md:hidden"
      />
    </section>
  );
}
