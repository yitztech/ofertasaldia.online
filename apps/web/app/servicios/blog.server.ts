export interface Articulo {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content?: string;
  coverImageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  productId: string | null;
  productTitle: string | null;
  productDescription?: string | null;
  productPriceCents?: string | null;
  productCurrency?: string | null;
  productImageUrl?: string | null;
  productPlatform?: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  authorId?: string;
  authorName: string;
  authorAlias: string | null;
  authorAvatarUrl: string | null;
  authorDescription?: string | null;
}

export interface ArticuloInput {
  title: string;
  summary: string;
  content: string;
  coverImageUrl?: string | null;
  categoryId?: string | null;
  productId?: string | null;
  status: "draft" | "published";
}

const API_URL = process.env.API_URL ?? "http://api:3001";

export async function obtenerArticulos(options: {
  category?: string;
  q?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ items: Articulo[]; nextCursor: string | null }> {
  const params = new URLSearchParams();
  if (options.category) params.set("category", options.category);
  if (options.q) params.set("q", options.q);
  if (options.cursor) params.set("cursor", options.cursor);
  if (options.limit) params.set("limit", String(options.limit));

  try {
    const res = await fetch(`${API_URL}/api/articles?${params.toString()}`, {
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return (await res.json()) as { items: Articulo[]; nextCursor: string | null };
    }
  } catch {
    // Retorno vacío ante fallo de red
  }

  return { items: [], nextCursor: null };
}

export async function obtenerArticulo(
  slug: string,
  request?: Request,
): Promise<Articulo | null> {
  const headers: Record<string, string> = {};
  if (request) {
    const cookie = request.headers.get("cookie");
    if (cookie) headers.cookie = cookie;
  }

  try {
    const res = await fetch(`${API_URL}/api/articles/${encodeURIComponent(slug)}`, {
      headers,
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      return (await res.json()) as Articulo;
    }
  } catch {
    return null;
  }

  return null;
}

export async function obtenerMisArticulos(request: Request): Promise<Articulo[]> {
  const cookie = request.headers.get("cookie") ?? "";
  try {
    const res = await fetch(`${API_URL}/api/articles/my-articles`, {
      headers: { cookie },
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const data = (await res.json()) as { articles: Articulo[] };
      return data.articles;
    }
  } catch {
    return [];
  }

  return [];
}

export async function crearArticulo(
  request: Request,
  data: ArticuloInput,
): Promise<{ ok: boolean; article?: Articulo; error?: string }> {
  const origin = request.headers.get("origin") ?? process.env.SITE_URL ?? "";
  const cookie = request.headers.get("cookie") ?? "";

  try {
    const res = await fetch(`${API_URL}/api/articles`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        "x-csrf": "1",
        cookie,
        "x-real-ip": request.headers.get("x-real-ip") ?? "",
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });

    if (res.ok) {
      const article = (await res.json()) as Articulo;
      return { ok: true, article };
    }

    const problem = (await res.json().catch(() => ({}))) as {
      code?: string;
      detail?: string;
      errors?: Array<{ message?: string }>;
    };

    if (problem.code === "pro_subscription_required") {
      return {
        ok: false,
        error: "Se requiere una suscripción Pro activa para publicar artículos y reviews.",
      };
    }

    return {
      ok: false,
      error:
        problem.errors?.[0]?.message ||
        problem.detail ||
        "No se pudo guardar el artículo.",
    };
  } catch {
    return { ok: false, error: "Error de conexión con el servicio." };
  }
}

export async function actualizarArticulo(
  request: Request,
  id: string,
  data: ArticuloInput,
): Promise<{ ok: boolean; article?: Articulo; error?: string }> {
  const origin = request.headers.get("origin") ?? process.env.SITE_URL ?? "";
  const cookie = request.headers.get("cookie") ?? "";

  try {
    const res = await fetch(`${API_URL}/api/articles/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin,
        "x-csrf": "1",
        cookie,
        "x-real-ip": request.headers.get("x-real-ip") ?? "",
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });

    if (res.ok) {
      const article = (await res.json()) as Articulo;
      return { ok: true, article };
    }

    const problem = (await res.json().catch(() => ({}))) as {
      code?: string;
      detail?: string;
      errors?: Array<{ message?: string }>;
    };

    return {
      ok: false,
      error:
        problem.errors?.[0]?.message ||
        problem.detail ||
        "No se pudo actualizar el artículo.",
    };
  } catch {
    return { ok: false, error: "Error de conexión con el servicio." };
  }
}

export async function eliminarArticulo(
  request: Request,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const origin = request.headers.get("origin") ?? process.env.SITE_URL ?? "";
  const cookie = request.headers.get("cookie") ?? "";

  try {
    const res = await fetch(`${API_URL}/api/articles/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        origin,
        "x-csrf": "1",
        cookie,
        "x-real-ip": request.headers.get("x-real-ip") ?? "",
      },
      signal: AbortSignal.timeout(5000),
      redirect: "error",
    });

    if (res.ok) {
      return { ok: true };
    }
  } catch {
    return { ok: false, error: "Error de conexión." };
  }

  return { ok: false, error: "No se pudo eliminar el artículo." };
}
