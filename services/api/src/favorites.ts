import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthService, problem } from "./auth.js";
import { Database } from "./database.js";

const uuidSchema = z.string().uuid();

@Controller("api/favorites")
export class FavoritesController {
  constructor(
    private readonly db: Database,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async listFavorites(@Req() request: FastifyRequest) {
    const user = await this.auth.user(request);
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
              p.is_demo AS "isDemo",
              f.created_at AS "savedAt"
       FROM favorites f
       JOIN products p ON p.id = f.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC
       LIMIT 100`,
      [user.id],
    );
    return {
      items: result.rows,
      productIds: result.rows.map((r: { id: string }) => r.id),
    };
  }

  @Post(":productId")
  @HttpCode(200)
  async addFavorite(
    @Param("productId") productId: string,
    @Req() request: FastifyRequest,
  ) {
    this.auth.csrf(request);
    const user = await this.auth.user(request);
    if (!uuidSchema.safeParse(productId).success) {
      problem(422, "validation_failed", "Identificador de producto no válido.");
    }

    const exists = await this.db.pool.query(
      "SELECT id FROM products WHERE id = $1",
      [productId],
    );
    if (!exists.rows.length) {
      problem(404, "product_not_found", "Producto no encontrado.");
    }

    await this.db.pool.query(
      `INSERT INTO favorites (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [user.id, productId],
    );

    return {
      status: "ok",
      productId,
      saved: true,
    };
  }

  @Delete(":productId")
  @HttpCode(200)
  async removeFavorite(
    @Param("productId") productId: string,
    @Req() request: FastifyRequest,
  ) {
    this.auth.csrf(request);
    const user = await this.auth.user(request);
    if (!uuidSchema.safeParse(productId).success) {
      problem(422, "validation_failed", "Identificador de producto no válido.");
    }

    await this.db.pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND product_id = $2",
      [user.id, productId],
    );

    return {
      status: "ok",
      productId,
      saved: false,
    };
  }
}
