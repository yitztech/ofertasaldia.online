import type { Oferta } from "~/datos/tipos";
import { EstadoVacio } from "~/components/comun/estados";
import { cn } from "~/utils";
import { TarjetaOferta } from "./tarjeta-oferta";

export function RejillaOfertas({
  ofertas,
  boton,
  className,
  vacio,
}: {
  ofertas: Oferta[];
  boton?: "marca" | "violeta";
  className?: string;
  vacio?: { titulo: string; descripcion: string; accion?: { texto: string; a: string } };
}) {
  if (!ofertas.length) {
    return (
      <EstadoVacio
        titulo={vacio?.titulo ?? "No hay ofertas por ahora"}
        descripcion={vacio?.descripcion ?? "Vuelve pronto: se publican ofertas nuevas todos los días."}
        accion={vacio?.accion}
      />
    );
  }
  return (
    <ul className={cn("m-0 grid list-none gap-4 p-0", className)}>
      {ofertas.map((oferta) => (
        <li key={oferta.id} className="flex">
          <div className="w-full">
            <TarjetaOferta oferta={oferta} boton={boton} />
          </div>
        </li>
      ))}
    </ul>
  );
}
