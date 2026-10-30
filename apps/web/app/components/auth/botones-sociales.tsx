import { AppleIcon } from "lucide-react";
import { GoogleIcono } from "~/components/comun/iconos-marca";
import { Button } from "~/components/ui/button";

/** Acceso con Google y Apple: sin acción hasta conectar el backend. */
export function BotonesSociales({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground" role="separator" aria-label={texto}>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        <span aria-hidden="true">{texto}</span>
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" aria-label="Continuar con Google">
          <GoogleIcono className="size-5" />
          Google
        </Button>
        <Button type="button" variant="outline" aria-label="Continuar con Apple">
          <AppleIcon aria-hidden="true" className="size-5 fill-current" />
          Apple
        </Button>
      </div>
    </div>
  );
}
