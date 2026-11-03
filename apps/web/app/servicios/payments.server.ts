export interface Plan {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  interval: "month" | "year";
  popular?: boolean;
  features: string[];
}

export interface SuscripcionUsuario {
  status: "active" | "none" | "canceled";
  planId: string;
  startsAt: string | null;
  expiresAt: string | null;
  provider: string | null;
}

const API_URL = process.env.API_URL ?? "http://api:3001";

export async function obtenerPlanes(): Promise<Plan[]> {
  try {
    const res = await fetch(`${API_URL}/api/payments/plans`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as { plans: Plan[] };
      return data.plans;
    }
  } catch {
    // Si la API falla, devolver lista por defecto compatible
  }

  return [
    {
      id: "gratuito",
      name: "Plan Básico",
      description: "Ideal para creadores y afiliados que recién comienzan.",
      priceCents: 0,
      currency: "MXN",
      interval: "month",
      features: [
        "Hasta 10 productos recomendados",
        "Estadísticas básicas de clics",
        "Perfil público de afiliado",
        "Comisiones directas de tiendas",
      ],
    },
    {
      id: "pro",
      name: "Plan Creador Pro",
      description: "Para creadores de contenido y afiliados profesionales.",
      priceCents: 29900,
      currency: "MXN",
      interval: "month",
      popular: true,
      features: [
        "Productos y colecciones ilimitados",
        "Analítica y métricas en tiempo real",
        "Dominio y perfil personalizado",
        "Insignia de Afiliado Verificado",
        "Soporte prioritario 24/7",
      ],
    },
  ];
}

export async function obtenerSuscripcion(
  request: Request,
): Promise<SuscripcionUsuario> {
  const cookie = request.headers.get("cookie");
  if (!cookie) {
    return {
      status: "none",
      planId: "gratuito",
      startsAt: null,
      expiresAt: null,
      provider: null,
    };
  }

  try {
    const res = await fetch(`${API_URL}/api/payments/subscription`, {
      headers: { cookie },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      return (await res.json()) as SuscripcionUsuario;
    }
  } catch {
    // Fallback ante fallo temporal
  }

  return {
    status: "none",
    planId: "gratuito",
    startsAt: null,
    expiresAt: null,
    provider: null,
  };
}

export async function crearSesionCheckout(
  request: Request,
  planId: "pro",
): Promise<{ url: string; sessionId: string } | null> {
  const origin = request.headers.get("origin") ?? process.env.SITE_URL ?? "";
  const cookie = request.headers.get("cookie") ?? "";

  try {
    const res = await fetch(`${API_URL}/api/payments/checkout-session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        "x-csrf": "1",
        cookie,
        "x-real-ip": request.headers.get("x-real-ip") ?? "",
      },
      body: JSON.stringify({ planId }),
      signal: AbortSignal.timeout(6000),
      redirect: "error",
    });

    if (res.ok) {
      return (await res.json()) as { url: string; sessionId: string };
    }
  } catch {
    return null;
  }

  return null;
}
