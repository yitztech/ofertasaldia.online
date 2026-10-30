import * as React from "react";
import { cn } from "../../utils";

type AvatarProps = Omit<React.ComponentProps<"span">, "children"> & {
  src?: string;
  alt?: string;
  /** Iniciales que se muestran si no hay imagen o no carga. */
  iniciales: string;
};

function Avatar({ className, src, alt = "", iniciales, ...props }: AvatarProps) {
  const [fallo, setFallo] = React.useState(false);
  return (
    <span
      data-slot="avatar"
      className={cn(
        "relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-acento text-sm font-bold text-acento-foreground",
        className,
      )}
      {...props}
    >
      {src && !fallo ? (
        <img src={src} alt={alt} className="size-full object-cover" onError={() => setFallo(true)} />
      ) : (
        <span aria-hidden={alt ? undefined : true}>{iniciales}</span>
      )}
    </span>
  );
}

export { Avatar };
