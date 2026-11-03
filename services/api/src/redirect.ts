import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { Database } from "./database.js";
import { problem } from "./auth.js";
import { uuidv7 } from "./uuid.js";

const uuidSchema = z.string().uuid();
const aliasRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const allowedOrigins = new Set([
  "ficha",
  "portada",
  "pagina",
  "articulo",
  "correo",
  "busqueda",
  "panel",
]);

const BOT_REGEX =
  /bot|crawler|spider|crawling|googlebot|bingbot|yandex|duckduckbot|baiduspider|facebookexternalhit|whatsapp|slurp|headless/i;

@Controller()
export class RedirectController {
  constructor(private readonly db: Database) {}

  @Get("ir/:id")
  async ir(
    @Param("id") id: string,
    @Query() query: Record<string, unknown>,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.handleRedirect(id, query, request, reply);
  }

  @Get("api/redirect/:id")
  async redirect(
    @Param("id") id: string,
    @Query() query: Record<string, unknown>,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.handleRedirect(id, query, request, reply);
  }

  private async handleRedirect(
    id: string,
    query: Record<string, unknown>,
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    if (!uuidSchema.safeParse(id).success) {
      problem(404, "product_not_found", "Producto no encontrado.");
    }

    const prodRes = await this.db.pool.query(
      `SELECT id, platform, affiliate_url AS "affiliateUrl", status
       FROM products WHERE id = $1`,
      [id],
    );

    if (prodRes.rows.length === 0) {
      problem(404, "product_not_found", "Producto no encontrado.");
    }

    const product = prodRes.rows[0];
    const targetUrl =
      product.affiliateUrl ||
      (product.platform === "mercadolibre"
        ? "https://www.mercadolibre.com.mx"
        : "https://www.amazon.com.mx");

    // Detección de bots y rastreadores para no alterar métricas
    const userAgent = String(request.headers["user-agent"] ?? "");
    const isBot = BOT_REGEX.test(userAgent);

    if (!isBot) {
      let creatorId: string | null = null;
      const rawCreator = query.c ?? query.creador ?? query.creator;
      if (typeof rawCreator === "string" && rawCreator.trim()) {
        const creatorVal = rawCreator.trim();
        if (aliasRegex.test(creatorVal)) {
          const profRes = await this.db.pool.query(
            "SELECT user_id FROM profiles WHERE alias = $1",
            [creatorVal],
          );
          if (profRes.rows.length > 0) {
            creatorId = profRes.rows[0].user_id;
          }
        } else if (uuidSchema.safeParse(creatorVal).success) {
          const userRes = await this.db.pool.query(
            "SELECT id FROM users WHERE id = $1",
            [creatorVal],
          );
          if (userRes.rows.length > 0) {
            creatorId = userRes.rows[0].id;
          }
        }
      }

      const rawOrigin = query.o ?? query.origin ?? query.origen;
      const origin =
        typeof rawOrigin === "string" && allowedOrigins.has(rawOrigin.trim())
          ? rawOrigin.trim()
          : "directo";

      await this.db.pool.query(
        `INSERT INTO click_events (id, product_id, creator_id, origin, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [uuidv7(), product.id, creatorId, origin],
      );
    }

    return reply
      .header("Cache-Control", "no-store")
      .header("X-Robots-Tag", "noindex, nofollow")
      .code(302)
      .redirect(targetUrl);
  }
}
