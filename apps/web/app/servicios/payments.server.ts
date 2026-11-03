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

export interface ValidacionCupon {
  valid: true;
  couponId: string;
  code: string;
  description: string;
  discountType: "percent" | "amount_cents";
  discountValue: number;
  originalPriceCents: number;
  discountCents: number;
  finalPriceCents: number;
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

export async function validarCupon(
  code: string,
): Promise<{ ok: true; cupon: ValidacionCupon } | { ok: false; error: string }> {
  const limpio = code.trim().toUpperCase();
  if (!limpio) {
    return { ok: false, error: "Ingresa un código de cupón." };
  }
  try {
    const res = await fetch(`${API_URL}/api/payments/coupons/validate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ code: limpio, planId: "pro" }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const cupon = (await res.json()) as ValidacionCupon;
      return { ok: true, cupon };
    }
    const problem = (await res.json().catch(() => null)) as { detail?: string } | null;
    return {
      ok: false,
      error: problem?.detail || "El cupón ingresado no es válido o ha vencido.",
    };
  } catch {
    return {
      ok: false,
      error: "No se pudo verificar el cupón en este momento. Inténtalo de nuevo.",
    };
  }
}

export async function crearSesionCheckout(
  request: Request,
  planId: "pro",
  couponCode?: string,
): Promise<{ url: string; sessionId: string } | null> {
  const origin = request.headers.get("origin") ?? process.env.SITE_URL ?? "";
  const cookie = request.headers.get("cookie") ?? "";
  const limpio = couponCode?.trim().toUpperCase();

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
      body: JSON.stringify({
        planId,
        ...(limpio ? { couponCode: limpio } : {}),
      }),
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

export async function cancelarSuscripcion(
  request: Request,
): Promise<{ ok: boolean; error?: string }> {
  const origin = request.headers.get("origin") ?? process.env.SITE_URL ?? "";
  const cookie = request.headers.get("cookie") ?? "";

  try {
    const res = await fetch(`${API_URL}/api/payments/cancel`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        "x-csrf": "1",
        cookie,
        "x-real-ip": request.headers.get("x-real-ip") ?? "",
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return { ok: true };
    }
    const problem = (await res.json().catch(() => null)) as { detail?: string } | null;
    return { ok: false, error: problem?.detail || "No se pudo cancelar la suscripción." };
  } catch {
    return { ok: false, error: "Error de conexión al cancelar la suscripción." };
  }
}
