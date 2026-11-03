export function slugify(text: string): string {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const base = normalized.slice(0, 140) || "articulo";
  return base.replace(/^-+|-+$/g, "");
}

const UUID_SUFFIX_REGEX =
  /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

export function urlOferta(
  oferta: { id: string; nombre: string },
  alias?: string,
): string {
  const slug = slugify(oferta.nombre);
  const slugId = slug.endsWith(oferta.id) ? slug : `${slug}-${oferta.id}`;
  if (alias) {
    return `/c/${encodeURIComponent(alias)}/${slugId}`;
  }
  return `/oferta/${slugId}`;
}

export function extraerIdOferta(slugId: string): string {
  const match = slugId.match(UUID_SUFFIX_REGEX);
  if (match) return match[1].toLowerCase();
  return slugId;
}

