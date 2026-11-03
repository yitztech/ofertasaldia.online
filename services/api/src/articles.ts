import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Req,
  HttpCode,
  Injectable,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Database } from "./database.js";
import { AuthService, problem } from "./auth.js";
import { uuidv7 } from "./uuid.js";
import { z } from "zod";

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

const articleSchema = z.object({
  title: z
    .string()
    .min(5, "El título debe tener al menos 5 caracteres.")
    .max(150, "El título no puede exceder 150 caracteres."),
  summary: z
    .string()
    .min(10, "El resumen debe tener al menos 10 caracteres.")
    .max(500, "El resumen no puede exceder 500 caracteres."),
  content: z
    .string()
    .min(20, "El contenido debe tener al menos 20 caracteres.")
    .max(50000, "El contenido no puede exceder 50000 caracteres."),
  coverImageUrl: z.string().max(2048).url("URL de imagen no válida.").optional().nullable(),
  categoryId: z.string().max(50).optional().nullable(),
  productId: z.string().uuid("ID de producto no válido.").optional().nullable(),
  status: z.enum(["draft", "published"]),
});

export type ArticleInput = z.infer<typeof articleSchema>;

@Injectable()
export class ArticlesService {
  constructor(private readonly db: Database) {}

  async listPublished(filters: {
    category?: string;
    q?: string;
    limit?: number;
    cursor?: string;
  }) {
    const text = (filters.q ?? "").trim();
    const category = filters.category ?? null;
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), 50);
    const cursor = filters.cursor ?? null;

    const result = await this.db.pool.query(
      `SELECT
        a.id,
        a.title,
        a.slug,
        a.summary,
        a.cover_image_url AS "coverImageUrl",
        a.category_id AS "categoryId",
        c.name AS "categoryName",
        a.product_id AS "productId",
        p.title AS "productTitle",
        p.price_cents::text AS "productPriceCents",
        p.image_url AS "productImageUrl",
        p.platform AS "productPlatform",
        a.status,
        a.published_at AS "publishedAt",
        a.created_at AS "createdAt",
        u.id AS "authorId",
        u.name AS "authorName",
        pr.alias AS "authorAlias",
        pr.avatar_url AS "authorAvatarUrl"
      FROM articles a
      JOIN users u ON u.id = a.author_id
      LEFT JOIN profiles pr ON pr.user_id = u.id
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN products p ON p.id = a.product_id
      WHERE a.status = 'published'
        AND ($1 = '' OR strpos(lower(a.title || ' ' || a.summary), lower($1)) > 0)
        AND ($2::text IS NULL OR a.category_id = $2)
        AND ($3::uuid IS NULL OR a.id > $3::uuid)
      ORDER BY a.published_at DESC, a.id DESC
      LIMIT $4`,
      [text, category, cursor, limit + 1],
    );

    const items = result.rows.slice(0, limit);
    const nextCursor =
      result.rows.length > limit ? items[items.length - 1].id : null;

    return { items, nextCursor };
  }

  async getBySlug(slug: string, requestingUserId?: string) {
    const result = await this.db.pool.query(
      `SELECT
        a.id,
        a.author_id AS "authorId",
        a.title,
        a.slug,
        a.summary,
        a.content,
        a.cover_image_url AS "coverImageUrl",
        a.category_id AS "categoryId",
        c.name AS "categoryName",
        a.product_id AS "productId",
        p.title AS "productTitle",
        p.description AS "productDescription",
        p.price_cents::text AS "productPriceCents",
        p.currency AS "productCurrency",
        p.image_url AS "productImageUrl",
        p.platform AS "productPlatform",
        a.status,
        a.published_at AS "publishedAt",
        a.created_at AS "createdAt",
        u.name AS "authorName",
        pr.alias AS "authorAlias",
        pr.avatar_url AS "authorAvatarUrl",
        pr.description AS "authorDescription"
      FROM articles a
      JOIN users u ON u.id = a.author_id
      LEFT JOIN profiles pr ON pr.user_id = u.id
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN products p ON p.id = a.product_id
      WHERE a.slug = $1`,
      [slug],
    );

    const article = result.rows[0];
    if (!article) {
      problem(404, "not_found", "Artículo no encontrado.");
    }

    if (article.status === "draft" && article.authorId !== requestingUserId) {
      problem(404, "not_found", "Artículo no disponible.");
    }

    return article;
  }

  async listMyArticles(userId: string) {
    const result = await this.db.pool.query(
      `SELECT
        a.id,
        a.title,
        a.slug,
        a.summary,
        a.cover_image_url AS "coverImageUrl",
        a.category_id AS "categoryId",
        c.name AS "categoryName",
        a.product_id AS "productId",
        p.title AS "productTitle",
        a.status,
        a.published_at AS "publishedAt",
        a.created_at AS "createdAt",
        a.updated_at AS "updatedAt"
      FROM articles a
      LEFT JOIN categories c ON c.id = a.category_id
      LEFT JOIN products p ON p.id = a.product_id
      WHERE a.author_id = $1
      ORDER BY a.created_at DESC`,
      [userId],
    );

    return { articles: result.rows };
  }

  async hasProSubscription(userId: string): Promise<boolean> {
    const res = await this.db.pool.query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND plan_id = 'pro' AND starts_at <= now() AND expires_at > now() AND revoked_at IS NULL
       LIMIT 1`,
      [userId],
    );
    return Boolean(res.rows[0]);
  }

  private async generateUniqueSlug(baseTitle: string, excludeId?: string): Promise<string> {
    let slug = slugify(baseTitle);
    let counter = 1;

    while (true) {
      const candidate = counter === 1 ? slug : `${slug}-${counter}`;
      const existing = await this.db.pool.query(
        "SELECT id FROM articles WHERE slug = $1 AND ($2::uuid IS NULL OR id != $2::uuid)",
        [candidate, excludeId ?? null],
      );
      if (!existing.rows[0]) {
        return candidate;
      }
      counter++;
    }
  }

  async createArticle(userId: string, input: ArticleInput) {
    const isPro = await this.hasProSubscription(userId);
    if (!isPro) {
      problem(
        403,
        "pro_subscription_required",
        "Se requiere una suscripción Pro activa para publicar artículos y reviews de productos.",
      );
    }

    const id = uuidv7();
    const slug = await this.generateUniqueSlug(input.title);
    const publishedAt = input.status === "published" ? new Date() : null;

    await this.db.pool.query(
      `INSERT INTO articles (
        id, author_id, title, slug, summary, content,
        cover_image_url, category_id, product_id, status, published_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        userId,
        input.title,
        slug,
        input.summary,
        input.content,
        input.coverImageUrl ?? null,
        input.categoryId ?? null,
        input.productId ?? null,
        input.status,
        publishedAt,
      ],
    );

    return this.getBySlug(slug, userId);
  }

  async updateArticle(userId: string, articleId: string, input: ArticleInput) {
    const isPro = await this.hasProSubscription(userId);
    if (!isPro) {
      problem(
        403,
        "pro_subscription_required",
        "Se requiere una suscripción Pro activa para editar artículos.",
      );
    }

    const existingRes = await this.db.pool.query(
      "SELECT id, author_id AS \"authorId\", status, published_at AS \"publishedAt\" FROM articles WHERE id = $1",
      [articleId],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      problem(404, "not_found", "Artículo no encontrado.");
    }
    if (existing.authorId !== userId) {
      problem(403, "forbidden", "No tienes permiso para modificar este artículo.");
    }

    const slug = await this.generateUniqueSlug(input.title, articleId);
    let publishedAt = existing.publishedAt;
    if (input.status === "published" && !publishedAt) {
      publishedAt = new Date();
    }

    await this.db.pool.query(
      `UPDATE articles SET
        title = $1,
        slug = $2,
        summary = $3,
        content = $4,
        cover_image_url = $5,
        category_id = $6,
        product_id = $7,
        status = $8,
        published_at = $9,
        updated_at = now()
      WHERE id = $10`,
      [
        input.title,
        slug,
        input.summary,
        input.content,
        input.coverImageUrl ?? null,
        input.categoryId ?? null,
        input.productId ?? null,
        input.status,
        publishedAt,
        articleId,
      ],
    );

    return this.getBySlug(slug, userId);
  }

  async deleteArticle(userId: string, articleId: string) {
    const existingRes = await this.db.pool.query(
      "SELECT id, author_id AS \"authorId\" FROM articles WHERE id = $1",
      [articleId],
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      problem(404, "not_found", "Artículo no encontrado.");
    }
    if (existing.authorId !== userId) {
      problem(403, "forbidden", "No tienes permiso para eliminar este artículo.");
    }

    await this.db.pool.query("DELETE FROM articles WHERE id = $1", [articleId]);
    return { status: "ok" };
  }
}

@Controller("api/articles")
export class ArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async listPublished(@Query() query: Record<string, unknown>) {
    const category = typeof query.category === "string" ? query.category : undefined;
    const q = typeof query.q === "string" ? query.q : undefined;
    const limit = query.limit ? Number(query.limit) : undefined;
    const cursor = typeof query.cursor === "string" ? query.cursor : undefined;

    return this.articles.listPublished({ category, q, limit, cursor });
  }

  @Get("my-articles")
  async listMyArticles(@Req() request: FastifyRequest) {
    const user = await this.auth.user(request);
    return this.articles.listMyArticles(user.id);
  }

  @Get(":slug")
  async getBySlug(
    @Param("slug") slug: string,
    @Req() request: FastifyRequest,
  ) {
    let userId: string | undefined;
    try {
      const user = await this.auth.user(request);
      userId = user.id;
    } catch {
      // Usuario anónimo
    }

    return this.articles.getBySlug(slug, userId);
  }

  @Post()
  @HttpCode(201)
  async createArticle(@Req() request: FastifyRequest) {
    this.auth.csrf(request);
    const user = await this.auth.user(request);

    const parsed = articleSchema.safeParse(request.body);
    if (!parsed.success) {
      problem(422, "validation_failed", "Datos del artículo no válidos.", [
        {
          field: parsed.error.issues[0]?.path[0]?.toString() ?? "general",
          code: "invalid_input",
          message: parsed.error.issues[0]?.message ?? "Error de validación.",
        },
      ]);
    }

    return this.articles.createArticle(user.id, parsed.data);
  }

  @Put(":id")
  @HttpCode(200)
  async updateArticle(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
  ) {
    this.auth.csrf(request);
    const user = await this.auth.user(request);

    const parsed = articleSchema.safeParse(request.body);
    if (!parsed.success) {
      problem(422, "validation_failed", "Datos del artículo no válidos.", [
        {
          field: parsed.error.issues[0]?.path[0]?.toString() ?? "general",
          code: "invalid_input",
          message: parsed.error.issues[0]?.message ?? "Error de validación.",
        },
      ]);
    }

    return this.articles.updateArticle(user.id, id, parsed.data);
  }

  @Delete(":id")
  @HttpCode(200)
  async deleteArticle(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
  ) {
    this.auth.csrf(request);
    const user = await this.auth.user(request);
    return this.articles.deleteArticle(user.id, id);
  }
}
