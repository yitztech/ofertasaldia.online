import {
  ArrowLeftIcon,
  BoldIcon,
  CheckCircleIcon,
  Edit3Icon,
  EyeIcon,
  Heading2Icon,
  Heading3Icon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  ListOrderedIcon,
  QuoteIcon,
  SaveIcon,
  ShoppingBagIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NativeSelect } from "~/components/ui/select";
import { categorias } from "~/datos/categorias";
import { formatearMxn } from "~/lib/formato";
import { slugify } from "~/lib/slug";
import { cn } from "~/utils";

export interface EditorPostData {
  title: string;
  summary: string;
  content: string;
  coverImageUrl?: string | null;
  categoryId?: string | null;
  productId?: string | null;
  status: "draft" | "published";
}

export interface ProductoDisponible {
  id: string;
  title: string;
  priceCents: number;
  imageUrl: string | null;
  platform: string;
}

interface EditorWordpressProps {
  initialData?: Partial<EditorPostData>;
  productos?: ProductoDisponible[];
  submitting?: boolean;
  onSave: (data: EditorPostData) => void;
  error?: string | null;
}

export function EditorWordpress({
  initialData,
  productos = [],
  submitting = false,
  onSave,
  error,
}: EditorWordpressProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [summary, setSummary] = useState(initialData?.summary ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initialData?.coverImageUrl ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.categoryId ?? "electronica");
  const [productId, setProductId] = useState(initialData?.productId ?? "");
  const [status, setStatus] = useState<"draft" | "published">(initialData?.status ?? "published");
  const [tab, setTab] = useState<"editor" | "preview">("editor");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const summaryId = useId();
  const coverId = useId();
  const categorySelectId = useId();
  const productSelectId = useId();

  const slug = useMemo(() => slugify(title || "mi-resena"), [title]);

  // Cálculo de estadísticas estilo WordPress
  const palabras = useMemo(() => {
    const texto = `${title} ${summary} ${content}`.trim();
    if (!texto) return 0;
    return texto.split(/\s+/).filter(Boolean).length;
  }, [title, summary, content]);

  const minutosLectura = useMemo(() => {
    return Math.max(1, Math.ceil(palabras / 200));
  }, [palabras]);

  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id === productId);
  }, [productos, productId]);

  // Insertar formato en textarea
  const aplicarFormato = (prefijo: string, sufijo = "", plantilla = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const seleccionado = content.substring(start, end);
    const textoInsertar = seleccionado || plantilla;

    const nuevoContenido =
      content.substring(0, start) +
      prefijo +
      textoInsertar +
      sufijo +
      content.substring(end);

    setContent(nuevoContenido);

    // Reposicionar cursor
    setTimeout(() => {
      textarea.focus();
      const nuevoPos = start + prefijo.length + textoInsertar.length;
      textarea.setSelectionRange(nuevoPos, nuevoPos);
    }, 0);
  };

  const insertarBloqueProsContras = () => {
    const bloque = `\n\n### Lo mejor y lo peor\n\n**Pros:**\n- Gran relación calidad-precio\n- Excelente rendimiento y durabilidad\n- Fácil de configurar y utilizar\n\n**Contras:**\n- Puede mejorar el empaque original\n- No incluye accesorios adicionales\n\n`;
    aplicarFormato("", "", bloque);
  };

  const insertarVeredicto = () => {
    const bloque = `\n\n### Veredicto final\n\nTras probarlo exhaustivamente, este producto cumple con creces lo prometido para su rango de precio. Muy recomendado si buscas una opción confiable y respaldada.\n\n`;
    aplicarFormato("", "", bloque);
  };

  const handleGuardar = (nuevoEstado: "draft" | "published") => {
    setStatus(nuevoEstado);
    onSave({
      title,
      summary,
      content,
      coverImageUrl: coverImageUrl.trim() || null,
      categoryId: categoryId || null,
      productId: productId || null,
      status: nuevoEstado,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Barra superior de herramientas estilo Gutenberg / WordPress */}
      <header className="sticky top-16 z-30 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 p-4 shadow-tarjeta backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <Link to="/panel/articulos">
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              <span>Volver a mis artículos</span>
            </Link>
          </Button>

          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden="true" />

          <Badge variant={status === "published" ? "default" : "secondary"} className="capitalize">
            {status === "published" ? "Listo para publicar" : "Borrador"}
          </Badge>

          <span className="text-xs text-muted-foreground hidden md:inline">
            {palabras} palabras · ~{minutosLectura} min de lectura
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternar pestañas Editor / Vista previa */}
          <div role="tablist" aria-label="Modo de visualización" className="flex rounded-xl bg-muted p-1">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "editor"}
              onClick={() => setTab("editor")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === "editor" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Edit3Icon className="size-3.5" aria-hidden="true" />
              <span>Editor</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "preview"}
              onClick={() => setTab("preview")}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === "preview" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <EyeIcon className="size-3.5" aria-hidden="true" />
              <span>Vista previa</span>
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={() => handleGuardar("draft")}
            className="hidden sm:inline-flex"
          >
            Guardar borrador
          </Button>

          <Button
            type="button"
            variant="violeta"
            size="sm"
            disabled={submitting}
            onClick={() => handleGuardar("published")}
            className="gap-1.5 font-bold shadow-sm"
          >
            <SaveIcon className="size-4" aria-hidden="true" />
            <span>{submitting ? "Publicando..." : "Publicar reseña"}</span>
          </Button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {/* Cuerpo principal del editor */}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Lienzo del artículo */}
        <div className="flex flex-col gap-6">
          {tab === "editor" ? (
            <Card className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-tarjeta">
              {/* Título estilo WordPress */}
              <div>
                <Label htmlFor={titleId} className="sr-only">
                  Título de la reseña
                </Label>
                <input
                  id={titleId}
                  type="text"
                  value={title}
                  maxLength={150}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Añade un título atractivo para tu review..."
                  className="w-full border-none bg-transparent p-0 text-2xl font-extrabold tracking-tight placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0 sm:text-3xl"
                />
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Enlace permanente:</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-primary">
                    /blog/{slug}
                  </code>
                </div>
              </div>

              {/* Resumen corto / Lead */}
              <div className="flex flex-col gap-1.5 border-t border-border/60 pt-4">
                <Label htmlFor={summaryId} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Extracto / Resumen inicial (10 - 500 caracteres)
                </Label>
                <textarea
                  id={summaryId}
                  value={summary}
                  maxLength={500}
                  rows={2}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Escribe una introducción breve que resuma tu veredicto del producto..."
                  className="w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              {/* Barra de formato estilo barra de herramientas WordPress */}
              <div className="sticky top-36 z-20 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card/95 p-1.5 shadow-sm backdrop-blur">
                <button
                  type="button"
                  title="Subtítulo H2"
                  onClick={() => aplicarFormato("\n## ", "\n", "Título de sección")}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-foreground"
                >
                  <Heading2Icon className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Subtítulo H3"
                  onClick={() => aplicarFormato("\n### ", "\n", "Subsección")}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-foreground"
                >
                  <Heading3Icon className="size-4" aria-hidden="true" />
                </button>

                <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

                <button
                  type="button"
                  title="Negrita"
                  onClick={() => aplicarFormato("**", "**", "texto en negrita")}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-foreground font-bold"
                >
                  <BoldIcon className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Cursiva"
                  onClick={() => aplicarFormato("*", "*", "texto en cursiva")}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-foreground italic"
                >
                  <ItalicIcon className="size-4" aria-hidden="true" />
                </button>

                <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

                <button
                  type="button"
                  title="Lista con viñetas"
                  onClick={() => aplicarFormato("\n- ", "\n", "Elemento de lista")}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-foreground"
                >
                  <ListIcon className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Lista numerada"
                  onClick={() => aplicarFormato("\n1. ", "\n", "Paso ordenado")}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-foreground"
                >
                  <ListOrderedIcon className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Cita"
                  onClick={() => aplicarFormato("\n> ", "\n", "Cita o testimonio")}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-foreground"
                >
                  <QuoteIcon className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  title="Enlace"
                  onClick={() => aplicarFormato("[", "](https://ejemplo.com)", "texto del enlace")}
                  className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-muted text-foreground"
                >
                  <LinkIcon className="size-4" aria-hidden="true" />
                </button>

                <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />

                <button
                  type="button"
                  onClick={insertarBloqueProsContras}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-acento text-primary"
                >
                  <SparklesIcon className="size-3.5" aria-hidden="true" />
                  + Pros y Contras
                </button>

                <button
                  type="button"
                  onClick={insertarVeredicto}
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold hover:bg-acento text-primary"
                >
                  + Veredicto
                </button>
              </div>

              {/* Área de texto de contenido principal */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contenido-articulo" className="sr-only">
                  Contenido del artículo
                </Label>
                <textarea
                  id="contenido-articulo"
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={16}
                  placeholder="Comienza a redactar tu review aquí. Puedes incluir características, experiencia de uso real, pros y contras..."
                  className="w-full resize-y rounded-xl border border-input bg-background p-4 text-base leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring font-sans"
                />
              </div>
            </Card>
          ) : (
            /* Vista previa en tiempo real */
            <Card className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 shadow-tarjeta sm:p-10">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {categoryId}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ~{minutosLectura} min de lectura
                </span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
                {title || "Sin título definido"}
              </h1>

              {summary && (
                <p className="text-lg text-muted-foreground font-medium leading-relaxed border-l-4 border-primary pl-4">
                  {summary}
                </p>
              )}

              {coverImageUrl && (
                <div className="overflow-hidden rounded-2xl border border-border bg-muted">
                  <img
                    src={coverImageUrl}
                    alt={title}
                    className="max-h-96 w-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}

              {/* Tarjeta de producto recomendado integrada */}
              {productoSeleccionado && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-violeta/40 bg-violeta/5 p-5">
                  <div className="flex items-center gap-4">
                    {productoSeleccionado.imageUrl && (
                      <img
                        src={productoSeleccionado.imageUrl}
                        alt={productoSeleccionado.title}
                        className="size-16 rounded-xl object-contain bg-white p-1 border border-border"
                      />
                    )}
                    <div>
                      <Badge variant="default" className="bg-violeta text-white text-[0.625rem] mb-1">
                        PRODUCTO ANALIZADO EN ESTA RESEÑA
                      </Badge>
                      <h4 className="text-sm font-bold text-foreground line-clamp-1">
                        {productoSeleccionado.title}
                      </h4>
                      <p className="text-base font-extrabold text-precio m-0">
                        {formatearMxn(productoSeleccionado.priceCents)}
                      </p>
                    </div>
                  </div>
                  <Button variant="violeta" size="sm" className="w-full sm:w-auto font-bold shrink-0">
                    <ShoppingBagIcon className="size-4" aria-hidden="true" />
                    <span>Ver oferta en tienda</span>
                  </Button>
                </div>
              )}

              {/* Renderizado de markdown limpio */}
              <div className="prose prose-neutral dark:prose-invert max-w-none space-y-4 text-base leading-relaxed text-foreground/90">
                {content.split("\n\n").map((parrafo, i) => {
                  const p = parrafo.trim();
                  if (!p) return null;
                  if (p.startsWith("## ")) {
                    return (
                      <h2 key={i} className="text-2xl font-bold tracking-tight text-foreground mt-6 mb-2">
                        {p.replace("## ", "")}
                      </h2>
                    );
                  }
                  if (p.startsWith("### ")) {
                    return (
                      <h3 key={i} className="text-xl font-bold tracking-tight text-foreground mt-4 mb-2">
                        {p.replace("### ", "")}
                      </h3>
                    );
                  }
                  if (p.startsWith("> ")) {
                    return (
                      <blockquote key={i} className="border-l-4 border-violeta pl-4 italic text-muted-foreground my-4">
                        {p.replace("> ", "")}
                      </blockquote>
                    );
                  }
                  if (p.startsWith("- ")) {
                    const items = p.split("\n- ").map((item) => item.replace(/^- /, ""));
                    return (
                      <ul key={i} className="list-disc pl-5 space-y-1">
                        {items.map((it, idx) => (
                          <li key={idx}>{it}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={i}>{p}</p>;
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Barra lateral de metadatos del artículo (Categoría, Producto, Portada) */}
        <aside aria-label="Ajustes de la reseña" className="flex flex-col gap-5">
          <Card className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-tarjeta">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground m-0">
              Ajustes del artículo
            </h3>

            {/* Selector de categoría */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={categorySelectId} className="text-xs font-semibold text-foreground">
                Categoría principal
              </Label>
              <NativeSelect
                id={categorySelectId}
                value={categoryId ?? ""}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                {categorias
                  .filter((c) => c.id !== "todas")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
              </NativeSelect>
            </div>

            {/* Asociar producto del catálogo */}
            <div className="flex flex-col gap-1.5 border-t border-border/60 pt-4">
              <Label htmlFor={productSelectId} className="text-xs font-semibold text-foreground">
                Producto relacionado
              </Label>
              <NativeSelect
                id={productSelectId}
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">(Ninguno / Artículo general)</option>
                {productos.map((prod) => (
                  <option key={prod.id} value={prod.id}>
                    {prod.title} · {formatearMxn(prod.priceCents)}
                  </option>
                ))}
              </NativeSelect>
              <p className="text-[0.6875rem] text-muted-foreground m-0">
                Al seleccionar un producto, se mostrará automáticamente la tarjeta de compra con tu enlace de afiliado.
              </p>
            </div>

            {/* Imagen de portada */}
            <div className="flex flex-col gap-1.5 border-t border-border/60 pt-4">
              <Label htmlFor={coverId} className="text-xs font-semibold text-foreground">
                URL de imagen de portada
              </Label>
              <Input
                id={coverId}
                type="url"
                value={coverImageUrl}
                maxLength={2048}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
              />
              {coverImageUrl && (
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-muted">
                  <img
                    src={coverImageUrl}
                    alt="Vista previa de portada"
                    className="h-28 w-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>

            {/* Botones de acción móvil / adicionales */}
            <div className="flex flex-col gap-2 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="violeta"
                disabled={submitting}
                onClick={() => handleGuardar("published")}
                className="w-full font-bold shadow-md"
              >
                {submitting ? "Guardando..." : "Publicar reseña"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleGuardar("draft")}
                className="w-full"
              >
                Guardar como borrador
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
