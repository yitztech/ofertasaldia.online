import { CircleDollarSignIcon, EyeIcon, MousePointerClickIcon, TrendingUpIcon, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { Card } from "~/components/ui/card";
import type { ResumenMes as Resumen } from "~/datos/tipos";
import { formatearMxn, formatearNumero } from "~/lib/formato";
import { cn } from "~/utils";

function Dato({ icono: Icono, valor, etiqueta, positivo }: { icono: LucideIcon; valor: string; etiqueta: string; positivo?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className={cn("grid size-10 shrink-0 place-items-center rounded-xl", positivo ? "bg-success/12 text-success" : "bg-acento text-primary")}>
        <Icono className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="m-0 text-lg font-extrabold leading-6 cifras">{valor}</p>
        <p className="m-0 text-xs leading-4 text-muted-foreground">{etiqueta}</p>
      </div>
    </div>
  );
}

export function ResumenMes({ resumen }: { resumen: Resumen }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-extrabold">Resumen de este mes</h2>
        <Link to="/panel" className="text-xs font-semibold text-primary">
          Ver más
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-4">
        <Dato icono={MousePointerClickIcon} valor={formatearNumero(resumen.clics)} etiqueta="Clics" />
        <Dato icono={EyeIcon} valor={formatearNumero(resumen.productosVistos)} etiqueta="Productos vistos" />
        <Dato icono={CircleDollarSignIcon} valor={formatearMxn(resumen.gananciaCentavos).replace(" MXN", "")} etiqueta="Ganancia estimada" />
        <Dato icono={TrendingUpIcon} valor={`+${resumen.variacionPorcentaje}%`} etiqueta="vs. mes anterior" positivo />
      </div>
    </Card>
  );
}
