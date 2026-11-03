import { redirect } from "react-router";
import type { Route } from "./+types/ir";

export async function loader({ params, request }: Route.LoaderArgs) {
  const { id } = params;
  if (!id) throw new Response("No encontrado", { status: 404 });

  const url = new URL(request.url);
  const apiUrl = process.env.API_URL ?? "http://api:3001";

  // Delegar al backend para registro de analítica de clic y obtención del enlace de afiliado
  const targetApiUrl = `${apiUrl}/ir/${encodeURIComponent(id)}${url.search}`;
  try {
    const res = await fetch(targetApiUrl, {
      method: "GET",
      headers: {
        "user-agent": request.headers.get("user-agent") ?? "",
        "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
        "x-real-ip": request.headers.get("x-real-ip") ?? "",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });

    if (res.status === 302 || res.status === 301) {
      const location = res.headers.get("location");
      if (location) {
        return redirect(location, {
          status: 302,
          headers: {
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        });
      }
    }

    if (res.status === 404) {
      throw new Response("Producto no encontrado", { status: 404 });
    }
  } catch (err) {
    if (err instanceof Response) throw err;
  }

  return redirect("https://www.mercadolibre.com.mx", {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
