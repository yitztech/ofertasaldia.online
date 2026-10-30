import { CopyIcon, Share2Icon } from "lucide-react";
import { useState } from "react";
import { BurbujaSocial } from "~/components/comun/iconos-marca";
import { Card } from "~/components/ui/card";

const compartir = (url: string) => [
  { marca: "whatsapp" as const, nombre: "WhatsApp", a: `https://wa.me/?text=${encodeURIComponent(url)}` },
  { marca: "facebook" as const, nombre: "Facebook", a: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { marca: "x" as const, nombre: "X", a: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}` },
  { marca: "telegram" as const, nombre: "Telegram", a: `https://t.me/share/url?url=${encodeURIComponent(url)}` },
];

export function EnlaceAfiliado({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-extrabold">Tu enlace de afiliado</h2>
          <p className="m-0 text-sm text-muted-foreground">Comparte tu perfil y gana más</p>
        </div>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-violeta text-primary-foreground">
          <Share2Icon className="size-4" />
        </span>
      </div>
      <div className="flex overflow-hidden rounded-xl border border-input">
        <label htmlFor="enlace-afiliado" className="sr-only">
          Enlace público de tu perfil
        </label>
        <input
          id="enlace-afiliado"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="min-h-11 min-w-0 flex-1 bg-card px-3 text-sm text-foreground focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={copiar}
          aria-label="Copiar enlace"
          className="grid size-11 shrink-0 cursor-pointer place-items-center border-l border-input bg-card text-foreground hover:bg-acento"
        >
          <CopyIcon aria-hidden="true" className="size-[1.125rem]" />
        </button>
      </div>
      <p role="status" className="m-0 min-h-4 text-xs font-medium text-success">
        {copiado ? "Enlace copiado" : ""}
      </p>
      <ul className="m-0 flex list-none gap-2 p-0">
        {compartir(url).map((c) => (
          <li key={c.marca}>
            <a href={c.a} target="_blank" rel="noopener noreferrer" aria-label={`Compartir en ${c.nombre} (se abre en una pestaña nueva)`} className="inline-grid rounded-full">
              <BurbujaSocial marca={c.marca} />
            </a>
          </li>
        ))}
        <li>
          <button type="button" aria-label="Código QR" title="Próximamente" className="inline-grid cursor-default rounded-full">
            <BurbujaSocial marca="qr" />
          </button>
        </li>
      </ul>
    </Card>
  );
}
