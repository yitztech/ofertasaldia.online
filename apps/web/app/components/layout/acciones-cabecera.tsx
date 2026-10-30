import { BellIcon, ChevronDownIcon, CircleHelpIcon, CrownIcon, HeartIcon, ShoppingCartIcon } from "lucide-react";
import { Link } from "react-router";
import { Avatar } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { cn } from "~/utils";

export function EnlaceParaAfiliados() {
  return (
    <Link
      to="/registro"
      className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[0.8125rem] font-medium text-foreground no-underline hover:text-primary"
    >
      <CrownIcon aria-hidden="true" className="size-4 fill-corona text-corona" />
      Para afiliados
    </Link>
  );
}

export function EnlaceComoFunciona() {
  return (
    <Link
      to="/#como-funciona"
      className="inline-flex lg:hidden 2xl:inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[0.8125rem] font-medium text-foreground no-underline hover:text-primary"
    >
      <CircleHelpIcon aria-hidden="true" className="size-4" />
      Cómo funciona
    </Link>
  );
}

/** Botón de icono sin acción todavía (favoritos, avisos y carrito llegan con el backend). */
export function BotonIcono({
  etiqueta,
  children,
  punto,
  conteo,
}: {
  etiqueta: string;
  children: React.ReactNode;
  punto?: boolean;
  conteo?: number;
}) {
  return (
    <Button variant="ghost" size="icon" aria-label={etiqueta} className="relative rounded-full">
      {children}
      {punto ? <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-2 rounded-full bg-descuento" /> : null}
      {conteo !== undefined ? (
        <span aria-hidden="true" className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-descuento text-[0.625rem] font-bold text-white">
          {conteo}
        </span>
      ) : null}
    </Button>
  );
}

export const FavoritosBoton = () => (
  <BotonIcono etiqueta="Favoritos">
    <HeartIcon aria-hidden="true" />
  </BotonIcono>
);
export const AvisosBoton = () => (
  <BotonIcono etiqueta="Avisos" punto>
    <BellIcon aria-hidden="true" />
  </BotonIcono>
);
export const CarritoBoton = () => (
  <BotonIcono etiqueta="Carrito" conteo={0}>
    <ShoppingCartIcon aria-hidden="true" />
  </BotonIcono>
);

const pildora = "rounded-full px-5";

export function BotonesCuenta({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Button asChild variant="outline" size="sm" className={pildora}>
        <Link to="/entrar">Iniciar sesión</Link>
      </Button>
      <Button asChild size="sm" className={cn(pildora, "px-6")}>
        <Link to="/registro">Regístrate</Link>
      </Button>
    </span>
  );
}

export function MenuUsuario({ nombre, avatar }: { nombre: string; avatar: string }) {
  return (
    <Button variant="ghost" className="gap-2 rounded-full pl-1.5 pr-3" aria-label={`Cuenta de ${nombre}`}>
      <Avatar src={avatar} iniciales={nombre.slice(0, 1)} className="size-8" />
      <span className="text-sm font-semibold">{nombre}</span>
      <ChevronDownIcon aria-hidden="true" />
    </Button>
  );
}
