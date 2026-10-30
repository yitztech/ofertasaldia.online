import {
  BadgeCheckIcon,
  HistoryIcon,
  ImageIcon,
  UserRoundCheckIcon,
  type LucideIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { formatearPesos } from "~/utils";

export function meta() {
  return [
    { title: "OfertasAlDía · Ofertas de Mercado Libre con el precio comprobado" },
    {
      name: "description",
      content:
        "Recomendaciones de personas reales y precios verificados en Mercado Libre México, con su historial de 90 días.",
    },
  ];
}

const garantias: { icono: LucideIcon; titulo: string; texto: string }[] = [
  {
    icono: BadgeCheckIcon,
    titulo: "Precio verificado",
    texto: "Comprobamos precio y disponibilidad directamente en Mercado Libre.",
  },
  {
    icono: HistoryIcon,
    titulo: "Historial de 90 días",
    texto: "Ves cuánto bajó de verdad respecto al precio regular.",
  },
  {
    icono: UserRoundCheckIcon,
    titulo: "Elegida por una persona",
    texto: "Cada oferta lleva la firma de quien la recomienda.",
  },
];

const tematicas = [
  "Tecnología",
  "Hogar",
  "Cocina",
  "Audio",
  "Videojuegos",
  "Mascotas",
  "Cuidado personal",
  "Deporte",
];

// Muestras de maquetación: se sustituyen por el catálogo real cuando exista la API.
const muestras = [
  { id: 1, precio: 129900, anterior: 199900, descuento: 35, minutos: 12 },
  { id: 2, precio: 84900, anterior: 109900, descuento: 23, minutos: 25 },
  { id: 3, precio: 249900, anterior: 359900, descuento: 31, minutos: 8 },
  { id: 4, precio: 39900, anterior: 59900, descuento: 33, minutos: 41 },
];

export default function Portada() {
  return (
    <>
      <section className="contenedor grid gap-8 py-10 lg:grid-cols-[1fr_minmax(340px,420px)] lg:gap-12 lg:py-14">
        <div className="flex flex-col justify-center gap-6">
          <h1 className="m-0 text-[clamp(2.25rem,5.2vw,4rem)] font-extrabold leading-[1.02] tracking-[-0.035em]">
            Ofertas de Mercado Libre con el precio comprobado
          </h1>
          <p className="m-0 max-w-[60ch] text-lg text-muted-foreground">
            Personas reales recomiendan lo que vale la pena y nosotros verificamos el precio una y
            otra vez. Tú decides con datos, no con descuentos inflados.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="w-full sm:w-auto">
              <a href="#ofertas">Ver ofertas recientes</a>
            </Button>
          </div>
          <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-3">
            {garantias.map(({ icono: Icono, titulo, texto }) => (
              <li key={titulo} className="flex flex-col gap-1.5">
                <Icono className="size-5 text-success" aria-hidden="true" />
                <h2 className="m-0 text-base font-bold leading-tight tracking-tight">{titulo}</h2>
                <p className="m-0 text-sm text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ul>
        </div>

        <Card className="self-center shadow-xs">
          <CardHeader>
            <Badge variant="discount" className="w-fit">
              −35&nbsp;%
            </Badge>
            <CardTitle>La mayor rebaja ahora</CardTitle>
            <CardDescription>Aquí irá el expediente destacado.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid aspect-square place-items-center rounded-lg border border-border bg-secondary">
              <ImageIcon className="size-10 text-muted-foreground/70" aria-hidden="true" />
            </div>
            <p className="m-0 flex items-baseline gap-3 font-display cifras">
              <span className="text-4xl font-extrabold leading-none">{formatearPesos(129900)}</span>
              <del className="text-base text-muted-foreground">{formatearPesos(199900)}</del>
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="tematicas" aria-labelledby="titulo-tematicas" className="contenedor scroll-mt-20 py-6">
        <h2 id="titulo-tematicas" className="m-0 mb-4 text-[1.55rem] font-bold leading-tight">
          Temáticas
        </h2>
        <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
          {tematicas.map((nombre) => (
            <li key={nombre}>
              <Badge variant="outline" className="px-3 py-1.5 text-sm">
                {nombre}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section id="ofertas" aria-labelledby="titulo-ofertas" className="contenedor scroll-mt-20 py-10">
        <h2 id="titulo-ofertas" className="m-0 mb-4 text-[1.55rem] font-bold leading-tight">
          Recién publicadas
        </h2>
        <Alert role="note" variant="warning" className="mb-6">
          <AlertTitle>Maquetación en curso</AlertTitle>
          <AlertDescription>
            Estas tarjetas son de muestra; los productos y precios reales llegarán con el catálogo.
          </AlertDescription>
        </Alert>
        <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 min-[720px]:grid-cols-3 min-[1100px]:grid-cols-4">
          {muestras.map((m) => (
            <li key={m.id} className="flex">
              <Card className="flex w-full flex-col">
                <CardHeader className="gap-3 p-3 sm:p-4">
                  <div className="relative grid aspect-square place-items-center rounded-lg border border-border bg-secondary">
                    <ImageIcon className="size-8 text-muted-foreground/70" aria-hidden="true" />
                    <Badge variant="discount" className="absolute left-2 top-2">
                      −{m.descuento}&nbsp;%
                    </Badge>
                  </div>
                  <CardTitle className="text-[0.95rem] font-semibold leading-[1.32] line-clamp-2">
                    Producto de muestra {m.id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-1 p-3 pt-0 sm:p-4 sm:pt-0">
                  <p className="m-0 flex flex-wrap items-baseline gap-x-2 font-display cifras">
                    <span className="text-[1.35rem] font-extrabold leading-none">
                      {formatearPesos(m.precio)}
                    </span>
                    <del className="text-sm text-muted-foreground">{formatearPesos(m.anterior)}</del>
                  </p>
                  <Badge variant="verified" className="w-fit">
                    <BadgeCheckIcon className="size-3.5 text-success" aria-hidden="true" />
                    Verificado hace {m.minutos} min
                  </Badge>
                </CardContent>
                <CardFooter className="gap-2 border-t border-dashed border-border p-3 pt-3 text-sm text-muted-foreground sm:p-4 sm:pt-3">
                  <Avatar aria-hidden="true">OA</Avatar>
                  Recomienda la casa
                </CardFooter>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
