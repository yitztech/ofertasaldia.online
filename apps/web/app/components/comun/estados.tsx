import { AlertCircleIcon, SearchXIcon } from "lucide-react";
import { Link } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyIcon, EmptyTitle } from "~/components/ui/empty";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/utils";

export function EstadoVacio({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion: string;
  accion?: { texto: string; a: string };
}) {
  return (
    <Empty role="status">
      <EmptyIcon>
        <SearchXIcon aria-hidden="true" />
      </EmptyIcon>
      <EmptyTitle>{titulo}</EmptyTitle>
      <EmptyDescription>{descripcion}</EmptyDescription>
      {accion ? (
        <Button asChild variant="suave" size="sm">
          <Link to={accion.a}>{accion.texto}</Link>
        </Button>
      ) : null}
    </Empty>
  );
}

export function EstadoError({ titulo = "No pudimos cargar la información", descripcion = "Inténtalo de nuevo en unos minutos." }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircleIcon aria-hidden="true" className="size-5 text-destructive" />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>{descripcion}</AlertDescription>
    </Alert>
  );
}

export function TarjetasCargando({ cantidad = 6, className }: { cantidad?: number; className?: string }) {
  return (
    <div role="status" aria-label="Cargando" className={cn("grid gap-4", className)}>
      {Array.from({ length: cantidad }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
