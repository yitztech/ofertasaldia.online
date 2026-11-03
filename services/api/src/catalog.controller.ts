import {
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthService, problem } from "./auth.js";
import { Database } from "./database.js";
import { MeliSyncService } from "./meli.js";
import { openApiSpec } from "./openapi.js";
import { uuidv7 } from "./uuid.js";

const uuidSchema = z.string().uuid();

@Controller("api")
export class CatalogController {
  constructor(
    private readonly db: Database,
    private readonly meli: MeliSyncService,
    private readonly auth: AuthService,
  ) {}

  @Get("openapi.json")
  openapi() {
    return openApiSpec;
  }

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
      if (!uuidSchema.safeParse(cursor).success)
        invalid("Cursor no válido.");
    }
    const result = await this.db.pool.query(
      `SELECT p.id, p.title, p.description, p.category_id AS "categoryId",
       c.name AS "categoryName", p.platform,
       p.price_cents::text AS "priceCents",
       p.original_price_cents::text AS "originalPriceCents",
       p.discount_percentage AS "discountPercentage",
       p.currency, p.image_url AS "imageUrl",
       p.affiliate_url AS "affiliateUrl",
       p.external_id AS "externalId",
       p.rating::float AS "rating",
       p.reviews_count AS "reviewsCount",
       p.status,
       p.last_checked_at AS "lastCheckedAt",
       p.is_demo AS "isDemo"
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE ($1 = '' OR strpos(lower(p.title), lower($1)) > 0)
       AND ($2::text IS NULL OR p.category_id = $2)
       AND ($3::text IS NULL OR p.platform = $3)
       AND ($4::uuid IS NULL OR p.id > $4::uuid)
       ORDER BY p.id LIMIT $5`,
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

  @Get("products/:id")
  async productById(@Param("id") id: string) {
    if (!uuidSchema.safeParse(id).success) {
      problem(422, "validation_failed", "Identificador de producto no válido.");
    }
    const productRes = await this.db.pool.query(
      `SELECT p.id, p.title, p.description, p.category_id AS "categoryId",
       c.name AS "categoryName", p.platform,
       p.price_cents::text AS "priceCents",
       p.original_price_cents::text AS "originalPriceCents",
       p.discount_percentage AS "discountPercentage",
       p.currency, p.image_url AS "imageUrl",
       p.affiliate_url AS "affiliateUrl",
       p.external_id AS "externalId",
       p.rating::float AS "rating",
       p.reviews_count AS "reviewsCount",
       p.status,
       p.last_checked_at AS "lastCheckedAt",
       p.is_demo AS "isDemo",
       p.created_at AS "createdAt",
       p.updated_at AS "updatedAt"
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = $1`,
      [id],
    );
    if (!productRes.rows.length) {
      problem(404, "product_not_found", "Producto no encontrado.");
    }
    const product = productRes.rows[0];

    const historyRes = await this.db.pool.query(
      `SELECT id, price_cents::text AS "priceCents", recorded_at AS "recordedAt"
       FROM price_history
       WHERE product_id = $1
       ORDER BY recorded_at ASC`,
      [id],
    );

    return {
      ...product,
      priceHistory: historyRes.rows,
    };
  }

  @Post("products/:id/check-price")
  async checkProductPrice(@Param("id") id: string) {
    if (!uuidSchema.safeParse(id).success) {
      problem(422, "validation_failed", "Identificador de producto no válido.");
    }
    const productRes = await this.db.pool.query(
      `SELECT id, title, external_id AS "externalId", price_cents::text AS "priceCents",
       original_price_cents::text AS "originalPriceCents", status
       FROM products WHERE id = $1`,
      [id],
    );
    if (!productRes.rows.length) {
      problem(404, "product_not_found", "Producto no encontrado.");
    }
    const product = productRes.rows[0];
    const prevPriceCents = Number(product.priceCents);

    let currentPriceCents = prevPriceCents;
    let originalPriceCents = product.originalPriceCents ? Number(product.originalPriceCents) : null;
    let discountPercentage = originalPriceCents && originalPriceCents > currentPriceCents
      ? Math.round(((originalPriceCents - currentPriceCents) / originalPriceCents) * 100)
      : null;
    let newStatus = product.status;

    if (product.externalId) {
      const synced = await this.meli.checkPrice(product.externalId, prevPriceCents);
      if (synced) {
        currentPriceCents = synced.currentPriceCents;
        if (synced.originalPriceCents) originalPriceCents = synced.originalPriceCents;
        if (synced.discountPercentage !== null) discountPercentage = synced.discountPercentage;
        newStatus = synced.status;
      }
    }

    const now = new Date();
    await this.db.pool.query(
      `UPDATE products
       SET price_cents = $1,
           original_price_cents = $2,
           discount_percentage = $3,
           status = $4,
           last_checked_at = $5,
           updated_at = $5
       WHERE id = $6`,
      [currentPriceCents, originalPriceCents, discountPercentage, newStatus, now, id],
    );

    if (currentPriceCents !== prevPriceCents) {
      await this.db.pool.query(
        `INSERT INTO price_history (id, product_id, price_cents, recorded_at)
         VALUES ($1, $2, $3, $4)`,
        [uuidv7(), id, currentPriceCents, now],
      );
    }

    return {
      status: "ok",
      productId: id,
      currentPriceCents,
      previousPriceCents: prevPriceCents,
      discountPercentage,
      lastCheckedAt: now.toISOString(),
      changed: currentPriceCents !== prevPriceCents,
    };
  }

  @Post("admin/catalog/sync")
  async syncCatalog(@Req() request: FastifyRequest) {
    const user = await this.auth.user(request);
    if (user.role !== "admin") {
      problem(403, "forbidden", "No tienes permiso para acceder.");
    }

    const productsRes = await this.db.pool.query(
      `SELECT id, external_id AS "externalId", price_cents::text AS "priceCents",
       original_price_cents::text AS "originalPriceCents"
       FROM products
       WHERE external_id IS NOT NULL
       LIMIT 50`,
    );

    let updatedCount = 0;
    const now = new Date();

    for (const p of productsRes.rows) {
      const prevPrice = Number(p.priceCents);
      const synced = await this.meli.checkPrice(p.externalId, prevPrice);
      if (synced) {
        await this.db.pool.query(
          `UPDATE products
           SET price_cents = $1,
               original_price_cents = $2,
               discount_percentage = $3,
               status = $4,
               last_checked_at = $5,
               updated_at = $5
           WHERE id = $6`,
          [
            synced.currentPriceCents,
            synced.originalPriceCents ?? p.originalPriceCents,
            synced.discountPercentage,
            synced.status,
            now,
            p.id,
          ],
        );

        if (synced.currentPriceCents !== prevPrice) {
          await this.db.pool.query(
            `INSERT INTO price_history (id, product_id, price_cents, recorded_at)
             VALUES ($1, $2, $3, $4)`,
            [uuidv7(), p.id, synced.currentPriceCents, now],
          );
          updatedCount++;
        }
      }
    }

    await this.db.pool.query(
      `INSERT INTO admin_audit (id, actor_id, action, target_id, created_at)
       VALUES ($1, $2, 'catalog.sync', $3, now())`,
      [uuidv7(), user.id, user.id],
    );

    return {
      status: "ok",
      total: productsRes.rows.length,
      updated: updatedCount,
      syncedAt: now.toISOString(),
    };
  }
}
