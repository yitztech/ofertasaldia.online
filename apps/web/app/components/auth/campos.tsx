import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { EyeIcon, EyeOffIcon, type LucideIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { cn } from "~/utils";

interface CampoTextoProps extends Omit<ComponentProps<"input">, "id"> {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
  error?: string;
  /** Contenido a la derecha del campo (por ejemplo, el botón de mostrar contraseña). */
  derecha?: ReactNode;
  ayuda?: string;
}

/** Campo con etiqueta visible, icono, ayuda y error asociado (AGENTS §6). */
export function CampoTexto({
  id,
  etiqueta,
  icono: Icono,
  error,
  derecha,
  ayuda,
  className,
  "aria-describedby": describedbyExterno,
  ...props
}: CampoTextoProps) {
  const errorId = `${id}-error`;
  const ayudaId = `${id}-ayuda`;
  const descrito = [error ? errorId : null, ayuda ? ayudaId : null, describedbyExterno].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-[0.8125rem]">
        {etiqueta}
      </Label>
      <div className="relative flex items-center">
        <Icono aria-hidden="true" className="pointer-events-none absolute left-3.5 size-[1.125rem] text-muted-foreground" />
        <Input
          id={id}
          name={props.name ?? id}
          aria-invalid={error ? true : undefined}
          aria-describedby={descrito}
          className={cn("pl-10", derecha && "pr-12", className)}
          {...props}
        />
        {derecha ? <div className="absolute right-1 flex">{derecha}</div> : null}
      </div>
      {ayuda ? (
        <p id={ayudaId} className="m-0 text-xs text-muted-foreground">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="m-0 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CampoContrasena({
  autoComplete,
  ...props
}: Omit<CampoTextoProps, "type" | "derecha" | "autoComplete"> & { autoComplete: "current-password" | "new-password" }) {
  const [visible, setVisible] = useState(false);
  const idBoton = useId();
  return (
    <CampoTexto
      {...props}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      autoCapitalize="none"
      spellCheck={false}
      derecha={
        <button
          id={idBoton}
          type="button"
          aria-pressed={visible}
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setVisible((v) => !v)}
          className="inline-grid size-11 cursor-pointer place-items-center rounded-xl text-primary hover:bg-acento"
        >
          {visible ? <EyeOffIcon aria-hidden="true" className="size-[1.125rem]" /> : <EyeIcon aria-hidden="true" className="size-[1.125rem]" />}
        </button>
      }
    />
  );
}
