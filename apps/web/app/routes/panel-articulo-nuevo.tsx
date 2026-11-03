import { redirect, useActionData, useNavigation, useSubmit } from "react-router";
import type { Route } from "./+types/panel-articulo-nuevo";
import { EditorWordpress, type EditorPostData, type ProductoDisponible } from "~/components/editor/editor-wordpress";
import { Cabecera } from "~/components/layout/cabecera";
import { MenuUsuario } from "~/components/layout/acciones-cabecera";
import { Pie } from "~/components/layout/pie";
import { obtenerUsuario } from "~/servicios/auth.server";
import { crearArticulo } from "~/servicios/blog.server";
import { obtenerSuscripcion } from "~/servicios/payments.server";

export function meta() {
  return [{ title: "Nueva Reseña · Editor WordPress · OfertasAlDia" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const usuario = await obtenerUsuario(request);
  if (!usuario) {
    throw redirect("/entrar?next=/panel/articulos/nuevo");
  }

  const suscripcion = await obtenerSuscripcion(request);
  if (suscripcion.status !== "active" || suscripcion.planId !== "pro") {
    throw redirect("/panel/articulos");
  }

  // Cargar productos disponibles para asociar
  let productos: ProductoDisponible[] = [];
  try {
    const res = await fetch(`${process.env.API_URL ?? "http://api:3001"}/api/products?limit=50`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        items: Array<{
          id: string;
          title: string;
          priceCents: string | number;
          imageUrl: string | null;
          platform: string;
        }>;
      };
      productos = data.items.map((it) => ({
        id: it.id,
        title: it.title,
        priceCents: Number(it.priceCents),
        imageUrl: it.imageUrl,
        platform: it.platform,
      }));
    }
  } catch {
    // Si falla la consulta de productos, se puede redactar sin asociar producto
  }

  return { usuario, productos };
}

export async function action({ request }: Route.ActionArgs) {
  const usuario = await obtenerUsuario(request);
  if (!usuario) throw redirect("/entrar");

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "");
  const summary = String(formData.get("summary") ?? "");
  const content = String(formData.get("content") ?? "");
  const coverImageUrl = formData.get("coverImageUrl")
    ? String(formData.get("coverImageUrl"))
    : null;
  const categoryId = formData.get("categoryId")
    ? String(formData.get("categoryId"))
    : null;
  const productId = formData.get("productId")
    ? String(formData.get("productId"))
    : null;
  const status = formData.get("status") === "published" ? "published" : "draft";

  const res = await crearArticulo(request, {
    title,
    summary,
    content,
    coverImageUrl,
    categoryId,
    productId,
    status,
  });

  if (res.ok && res.article) {
    if (status === "published") {
      return redirect(`/blog/${res.article.slug}`);
    }
    return redirect("/panel/articulos");
  }

  return { error: res.error || "No se pudo guardar el artículo." };
}

export default function PanelArticuloNuevo({ loaderData }: Route.ComponentProps) {
  const { usuario, productos } = loaderData;
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";

  const handleSave = (data: EditorPostData) => {
    const formData = new FormData();
    formData.set("title", data.title);
    formData.set("summary", data.summary);
    formData.set("content", data.content);
    if (data.coverImageUrl) formData.set("coverImageUrl", data.coverImageUrl);
    if (data.categoryId) formData.set("categoryId", data.categoryId);
    if (data.productId) formData.set("productId", data.productId);
    formData.set("status", data.status);

    submit(formData, { method: "post" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Cabecera
        conBuscador={false}
        acciones={<MenuUsuario nombre={usuario.name} />}
      />

      <main id="contenido" className="contenedor flex flex-1 flex-col py-8">
        <EditorWordpress
          productos={productos}
          submitting={submitting}
          onSave={handleSave}
          error={actionData?.error}
        />
      </main>

      <Pie />
    </div>
  );
}
