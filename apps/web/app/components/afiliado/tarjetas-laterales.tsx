import { ArrowRightIcon, CalendarIcon, CheckIcon, GiftIcon, MapPinIcon, UserPlusIcon } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import type { Afiliado, Coleccion } from "~/datos/tipos";

export function SobreAfiliado({ afiliado }: { afiliado: Afiliado }) {
  return (
    <Card className="p-5">
      <h2 className="mb-2 text-base font-extrabold">Sobre {afiliado.nombre}</h2>
      <p className="m-0 mb-3 text-sm leading-6 text-muted-foreground">{afiliado.descripcion}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
        <li className="flex items-center gap-2.5 text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-4" />
          {afiliado.ubicacion}
        </li>
        <li className="flex items-center gap-2.5 text-muted-foreground">
          <CalendarIcon aria-hidden="true" className="size-4" />
          {afiliado.miembroDesde}
        </li>
        {afiliado.verificado ? (
          <li className="flex items-center gap-2.5 font-medium text-primary">
            <span aria-hidden="true" className="grid size-4 place-items-center rounded-[0.3rem] bg-primary text-primary-foreground">
              <CheckIcon className="size-3" strokeWidth={3.5} />
            </span>
            Afiliado verificado
          </li>
        ) : null}
      </ul>
    </Card>
  );
}

export function ColeccionesDelAfiliado({ nombre, colecciones }: { nombre: string; colecciones: Coleccion[] }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-extrabold">Colecciones de {nombre}</h2>
        <Link to="/#colecciones" className="text-xs font-semibold text-primary">
          Ver todas
        </Link>
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {colecciones.map((c) => (
          <li key={c.id} className="relative flex items-center gap-3">
            <img src={c.imagen} alt="" loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <h3 className="m-0 truncate text-sm font-semibold">
                <Link to="/#colecciones" className="text-foreground no-underline after:absolute after:inset-0 after:content-['']">
                  {c.titulo}
                </Link>
              </h3>
              <p className="m-0 text-xs text-muted-foreground">{c.productos} productos</p>
            </div>
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-violeta-suave text-violeta">
              <ArrowRightIcon className="size-4" />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function LlamadaSeguir({ nombre }: { nombre: string }) {
  return (
    <Card className="flex flex-col gap-4 bg-hero-auth p-5">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-primary shadow-tarjeta">
          <GiftIcon className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-extrabold">¿Te gustan sus recomendaciones?</h2>
          <p className="m-0 text-sm text-muted-foreground">
            Sigue a {nombre} para recibir nuevas ofertas y colecciones.
          </p>
        </div>
      </div>
      <Button className="w-full">
        <UserPlusIcon aria-hidden="true" />
        Seguir
      </Button>
    </Card>
  );
}
