import {
  BookmarkIcon,
  ChartColumnIcon,
  HeartIcon,
  PackageIcon,
  SettingsIcon,
  UserIcon,
  WrenchIcon,
  BookOpenIcon,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/utils";

interface Elemento {
  texto: string;
  icono: LucideIcon;
  activo?: boolean;
}

const principales: Elemento[] = [
  { texto: "Mi perfil", icono: UserIcon, activo: true },
  { texto: "Mis productos", icono: PackageIcon },
  { texto: "Estadísticas", icono: ChartColumnIcon },
  { texto: "Mis colecciones", icono: BookmarkIcon },
  { texto: "Favoritos", icono: HeartIcon },
];

const secundarios: Elemento[] = [
  { texto: "Herramientas", icono: WrenchIcon },
  { texto: "Guías y recursos", icono: BookOpenIcon },
  { texto: "Configuración", icono: SettingsIcon },
];

const base = "flex min-h-11 shrink-0 items-center gap-3.5 rounded-xl px-4 text-sm font-medium no-underline";

function Item({ e }: { e: Elemento }) {
  const Icono = e.icono;
  if (e.activo) {
    return (
      <Link to="/panel" aria-current="page" className={cn(base, "bg-lila font-semibold text-primary")}>
        <Icono aria-hidden="true" className="size-5" />
        {e.texto}
      </Link>
    );
  }
  // Secciones del panel que aún no tienen diseño: visibles pero sin destino.
  return (
    <button type="button" aria-disabled="true" title="Próximamente" className={cn(base, "w-full cursor-default text-left text-foreground")}>
      <Icono aria-hidden="true" className="size-5" />
      {e.texto}
    </button>
  );
}

export function BarraLateralPanel() {
  return (
    <nav aria-label="Panel del afiliado" className="lg:sticky lg:top-20">
      <ul className="sin-barra m-0 flex list-none gap-1 overflow-x-auto p-0 lg:flex-col lg:overflow-visible">
        {principales.map((e) => (
          <li key={e.texto}>
            <Item e={e} />
          </li>
        ))}
        <li aria-hidden="true" className="mx-3 my-3 hidden h-px bg-border lg:block" />
        {secundarios.map((e) => (
          <li key={e.texto}>
            <Item e={e} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
