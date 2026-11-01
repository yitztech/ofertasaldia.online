import { Controller, Get, HttpException, Query } from "@nestjs/common";
import { Database } from "./database";

@Controller("api")
export class CatalogController {
  constructor(private readonly db: Database) {}

  @Get("categories")
  async categories() {
    const result = await this.db.pool.query(
      "SELECT id, name FROM categories ORDER BY id LIMIT 100",
    );
    return { items: result.rows, nextCursor: null };
  }

  @Get("products")
  async products(@Query() query: Record<string, unknown>) {
    const allowed = new Set(["q", "category", "platform", "limit", "cursor"]);
    const invalid = (detail: string): never => {
      throw new HttpException(
        {
          type: "about:blank",
          title: "Datos no válidos",
          status: 422,
          code: "validation_failed",
          detail,
        },
        422,
      );
    };
    if (Object.keys(query).some((key) => !allowed.has(key)))
      invalid("Parámetro desconocido.");
    if (Object.values(query).some((value) => typeof value !== "string"))
      invalid("Los parámetros deben ser textos.");
    const text = String(query.q ?? "").trim();
    if ([...text].length > 100)
      invalid("La búsqueda admite hasta 100 caracteres.");
    const category = query.category ? String(query.category) : null;
    if (category && !/^[a-z-]{1,50}$/.test(category))
      invalid("Categoría no válida.");
    const platform = query.platform ? String(query.platform) : null;
    if (platform && !["amazon", "mercadolibre"].includes(platform))
      invalid("Plataforma no válida.");
    const limit = query.limit === undefined ? 20 : Number(query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      invalid("El límite debe estar entre 1 y 100.");
    let cursor: string | null = null;
    if (query.cursor) {
      cursor = Buffer.from(String(query.cursor), "base64url").toString("utf8");
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
          cursor,
        )
      )
        invalid("Cursor no válido.");
    }
    const result = await this.db.pool.query(
      `SELECT id, title, description, category_id AS "categoryId", platform,
       price_cents::text AS "priceCents", currency, image_url AS "imageUrl", is_demo AS "isDemo"
       FROM products WHERE ($1 = '' OR strpos(lower(title), lower($1)) > 0)
       AND ($2::text IS NULL OR category_id = $2)
       AND ($3::text IS NULL OR platform = $3)
       AND ($4::uuid IS NULL OR id > $4::uuid) ORDER BY id LIMIT $5`,
      [text, category, platform, cursor, limit + 1],
    );
    const items = result.rows.slice(0, limit);
    return {
      items,
      nextCursor:
        result.rows.length > limit
          ? Buffer.from(items[items.length - 1].id).toString("base64url")
          : null,
    };
  }
}
