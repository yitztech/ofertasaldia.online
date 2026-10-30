import type { SVGProps } from "react";
import { PhoneIcon, QrCodeIcon, SendIcon } from "lucide-react";
import { cn } from "~/utils";

type Props = SVGProps<SVGSVGElement>;

export function AmazonIcono(props: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <text x="12" y="15.5" textAnchor="middle" fontSize="19" fontWeight="800" fill="currentColor" fontFamily="Arial, Helvetica, sans-serif">
        a
      </text>
      <path d="M4.5 18.2c4.6 2.6 10.2 2.5 15-.7" fill="none" stroke="#ff9900" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17.6 15.9l2.6 1.3-1.2 2.5" fill="none" stroke="#ff9900" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MercadoLibreIcono({ className }: { className?: string }) {
  return <img src="/img/plataformas/mercadolibre-icono.png" alt="" width={28} height={26} className={cn("h-auto", className)} />;
}

export function GoogleIcono(props: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 0 1-10.7-3.78H1.34v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.36 14.31a7.2 7.2 0 0 1 0-4.62V6.59H1.34a12 12 0 0 0 0 10.82l4.02-3.1z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.6 4.58 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.34 6.59l4.02 3.1A7.2 7.2 0 0 1 12 4.75z" />
    </svg>
  );
}

export function YouTubeIcono(props: Props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="2" y="5" width="20" height="14" rx="4.5" fill="currentColor" />
      <path d="M10 9.2v5.6l5-2.8z" fill="#fff" />
    </svg>
  );
}

export function InstagramIcono(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TikTokIcono(props: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M14 3v11.2a4 4 0 1 1-4-4" />
      <path d="M14 3c.4 2.6 2.1 4.2 5 4.4" />
    </svg>
  );
}

/** Burbujas de colores de compartir: círculo de marca con su glifo. */
export function BurbujaSocial({ marca, className }: { marca: "whatsapp" | "facebook" | "x" | "telegram" | "qr"; className?: string }) {
  const base = "inline-grid size-8 place-items-center rounded-full text-white";
  if (marca === "whatsapp")
    return (
      <span aria-hidden="true" className={cn(base, "bg-[#25d366]", className)}>
        <PhoneIcon className="size-4" fill="currentColor" />
      </span>
    );
  if (marca === "facebook")
    return (
      <span aria-hidden="true" className={cn(base, "bg-[#1877f2] text-base font-extrabold", className)}>
        f
      </span>
    );
  if (marca === "x")
    return (
      <span aria-hidden="true" className={cn(base, "bg-black text-sm font-bold", className)}>
        X
      </span>
    );
  if (marca === "telegram")
    return (
      <span aria-hidden="true" className={cn(base, "bg-[#2aabee]", className)}>
        <SendIcon className="size-4" />
      </span>
    );
  return (
    <span aria-hidden="true" className={cn(base, "bg-[#2a2146]", className)}>
      <QrCodeIcon className="size-4" />
    </span>
  );
}
