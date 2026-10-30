import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Cabecera } from "~/components/layout/cabecera";
import { Pie } from "~/components/layout/pie";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

export interface Beneficio {
  icono: LucideIcon;
  texto: string;
}

interface AuthLayoutProps {
  eyebrow: string;
  titulo: ReactNode;
  descripcion: string;
  beneficios: Beneficio[];
  imagen: { src: string; ancho: number; alto: number };
  /** Botón de la cabecera: lleva a la pantalla de acceso contraria. */
  accionCabecera: { texto: string; a: string };
  tituloTarjeta: string;
  subtituloTarjeta?: string;
  children: ReactNode;
}

/** Marco común de login, registro, recuperación y restablecimiento. */
export function AuthLayout({
  eyebrow,
  titulo,
  descripcion,
  beneficios,
  imagen,
  accionCabecera,
  tituloTarjeta,
  subtituloTarjeta,
  children,
}: AuthLayoutProps) {
  return (
    <>
      <Cabecera
        conBuscador={false}
        acciones={
          <>
            <span className="text-sm font-medium">¿Eres afiliado?</span>
            <Button asChild variant="outline" size="sm" className="rounded-full px-5">
              <Link to={accionCabecera.a}>{accionCabecera.texto}</Link>
            </Button>
          </>
        }
      />
      <main id="contenido" className="contenedor py-4 sm:py-6">
        <div className="relative isolate grid overflow-hidden rounded-3xl bg-hero-auth lg:min-h-[34rem] lg:grid-cols-[1fr_30rem]">
          <div className="relative isolate flex flex-col gap-4 p-6 sm:p-10 lg:p-14">
          <img
            src={imagen.src}
            alt=""
            width={imagen.ancho}
            height={imagen.alto}
            className="desvanecer-lateral-superior pointer-events-none absolute bottom-0 right-0 -z-10 hidden h-[64%] w-auto max-w-[48%] object-contain object-bottom-right md:block"
          />
            <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-primary">{eyebrow}</p>
            <h1 className="text-[clamp(2.25rem,4.6vw,3.25rem)] font-extrabold leading-[1.02] tracking-[-0.03em]">
              {titulo}
            </h1>
            <p className="m-0 max-w-[34ch] text-base sm:text-lg">{descripcion}</p>
            <ul className="m-0 mt-2 flex list-none flex-col gap-4 p-0">
              {beneficios.map(({ icono: Icono, texto }) => (
                <li key={texto} className="flex items-center gap-3.5 text-sm font-medium">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-card/80 text-primary shadow-tarjeta">
                    <Icono aria-hidden="true" className="size-5" />
                  </span>
                  <span className="max-w-[22ch]">{texto}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center justify-center p-4 pt-0 sm:p-8 lg:py-8">
            <Card className="w-full max-w-[30rem] p-6 sm:p-8">
              <div className="mb-5 flex flex-col gap-1">
                <h2 className="text-2xl font-extrabold tracking-tight">{tituloTarjeta}</h2>
                {subtituloTarjeta ? <p className="m-0 text-sm text-muted-foreground">{subtituloTarjeta}</p> : null}
              </div>
              {children}
            </Card>
          </div>
        </div>
      </main>
      <Pie />
    </>
  );
}
