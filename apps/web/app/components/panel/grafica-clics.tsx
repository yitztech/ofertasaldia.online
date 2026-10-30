import { useId } from "react";
import { Card } from "~/components/ui/card";
import type { PuntoClics } from "~/datos/tipos";
import { construirLinea } from "~/lib/graficas";

const ANCHO = 300;
const ALTO = 120;
const MAXIMO = 150;
const marcasY = [0, 50, 100, 150];
const marcasX = [
  { dia: 1, texto: "1 oct" },
  { dia: 8, texto: "8 oct" },
  { dia: 16, texto: "16 oct" },
  { dia: 24, texto: "24 oct" },
  { dia: 31, texto: "31 oct" },
];

export function GraficaClics({ serie, destacado = 24 }: { serie: PuntoClics[]; destacado?: number }) {
  const idGradiente = useId();
  const linea = construirLinea(serie, ANCHO, ALTO, MAXIMO);
  const punto = linea.puntos.find((p) => p.dia === destacado);
  const maximoReal = Math.max(...serie.map((p) => p.clics));
  const x = (dia: number) => ((dia - 1) / (serie.length - 1)) * ANCHO;
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-sm font-extrabold">Clics en los últimos 30 días</h2>
      <svg
        viewBox={`-30 -8 ${ANCHO + 40} ${ALTO + 40}`}
        role="img"
        aria-label={`Gráfica de clics por día. El máximo fue de ${maximoReal} clics.`}
        className="h-auto w-full overflow-visible"
      >
        <defs>
          <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {marcasY.map((v) => {
          const y = ALTO - (v / MAXIMO) * ALTO;
          return (
            <g key={v}>
              <line x1="0" x2={ANCHO} y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
              <text x="-6" y={y + 3} textAnchor="end" fontSize="9" fill="var(--muted-foreground)">
                {v}
              </text>
            </g>
          );
        })}
        <path d={linea.area} fill={`url(#${idGradiente})`} />
        <path d={linea.trazo} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {marcasX.map((m) => (
          <text key={m.dia} x={x(m.dia)} y={ALTO + 16} textAnchor="middle" fontSize="9" fill="var(--muted-foreground)">
            {m.texto}
          </text>
        ))}
        {punto ? (
          <g>
            <circle cx={punto.x} cy={punto.y} r="4" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
            <rect x={punto.x - 30} y={punto.y - 36} width="60" height="26" rx="6" fill="var(--card)" stroke="var(--border)" />
            <text x={punto.x} y={punto.y - 24} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--foreground)">
              {punto.clics} clics
            </text>
            <text x={punto.x} y={punto.y - 14} textAnchor="middle" fontSize="8" fill="var(--muted-foreground)">
              {marcasX.find((m) => m.dia === destacado)?.texto}
            </text>
          </g>
        ) : null}
      </svg>
    </Card>
  );
}
