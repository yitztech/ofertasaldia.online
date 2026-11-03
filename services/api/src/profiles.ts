import {
  Controller,
  Get,
  Put,
  Req,
  Param,
  Injectable,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { Database } from "./database.js";
import { AuthService, problem, fieldErrors } from "./auth.js";

const nameRegex = /^[\p{L}\p{M}](?:[\p{L}\p{M} '’.-]*[\p{L}\p{M}.])?$/u;
const aliasRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const updateProfileSchema = z
  .object({
    alias: z
      .string()
      .trim()
      .min(3)
      .max(50)
      .regex(
        aliasRegex,
        "El alias solo puede contener letras minúsculas, números y guiones sencillos.",
      )
      .optional(),
    name: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .regex(
        nameRegex,
        "El nombre solo acepta letras, espacios, apóstrofo, guion y punto.",
      )
      .optional(),
    description: z.string().max(5000).optional(),
    location: z.string().max(200).optional(),
    avatarUrl: z.string().max(2048).nullable().optional(),
    coverUrl: z.string().max(2048).nullable().optional(),
    accentColor: z
      .string()
      .regex(
        /^#[0-9a-fA-F]{6}$/,
        "El color de acento debe ser un código hexadecimal válido (#RRGGBB).",
      )
      .max(20)
      .optional(),
    socialLinks: z
      .array(
        z.object({
          red: z.string().min(1).max(30),
          url: z.string().max(2048).url("Cada enlace debe ser una URL válida."),
        }),
      )
      .max(20)
      .optional(),
  })
  .strict();

export interface ProfileRecord {
  userId: string;
  alias: string;
  name: string;
  email: string;
  description: string;
  location: string;
  avatarUrl: string;
  coverUrl: string;
  accentColor: string;
  socialLinks: Array<{ red: string; url: string }>;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

function formatMemberSince(date: Date): string {
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `Miembro desde ${meses[date.getMonth()]} ${date.getFullYear()}`;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly db: Database) {}

  async getOrCreateMyProfile(
    userId: string,
    userName: string,
    userEmail: string,
  ): Promise<ProfileRecord> {
    const existing = await this.db.pool.query(
      `SELECT p.user_id AS "userId", p.alias, u.name, u.email,
              p.description, p.location, p.avatar_url AS "avatarUrl",
              p.cover_url AS "coverUrl", p.accent_color AS "accentColor",
              p.social_links AS "socialLinks",
              (u.verified_at IS NOT NULL) AS "verified",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt"
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $1`,
      [userId],
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return {
        userId: row.userId,
        alias: row.alias,
        name: row.name,
        email: row.email,
        description: row.description || "",
        location: row.location || "",
        avatarUrl: row.avatarUrl || "/img/afiliado/carlos.png",
        coverUrl: row.coverUrl || "/img/hero-banner.jpg",
        accentColor: row.accentColor || "#4338ca",
        socialLinks: Array.isArray(row.socialLinks) ? row.socialLinks : [],
        verified: Boolean(row.verified),
        createdAt: new Date(row.createdAt).toISOString(),
        updatedAt: new Date(row.updatedAt).toISOString(),
      };
    }

    // Generar alias inicial
    let alias = userName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!alias || alias.length < 3) alias = `usuario-${userId.slice(0, 8)}`;
    if (alias.length > 40) alias = alias.slice(0, 40);

    const check = await this.db.pool.query(
      "SELECT user_id FROM profiles WHERE alias = $1",
      [alias],
    );
    if (check.rows.length > 0 && check.rows[0].user_id !== userId) {
      alias = `${alias.slice(0, 32)}-${userId.slice(0, 6)}`;
    }

    const inserted = await this.db.pool.query(
      `INSERT INTO profiles (
         user_id, alias, description, location, avatar_url, cover_url, accent_color, social_links
       ) VALUES ($1, $2, '', '', '/img/afiliado/carlos.png', '/img/hero-banner.jpg', '#4338ca', '[]'::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
       RETURNING user_id AS "userId", alias, description, location,
                 avatar_url AS "avatarUrl", cover_url AS "coverUrl",
                 accent_color AS "accentColor", social_links AS "socialLinks",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [userId, alias],
    );

    const row = inserted.rows[0];
    return {
      userId: row.userId,
      alias: row.alias,
      name: userName,
      email: userEmail,
      description: row.description || "",
      location: row.location || "",
      avatarUrl: row.avatarUrl || "/img/afiliado/carlos.png",
      coverUrl: row.coverUrl || "/img/hero-banner.jpg",
      accentColor: row.accentColor || "#4338ca",
      socialLinks: Array.isArray(row.socialLinks) ? row.socialLinks : [],
      verified: false,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }

  async updateProfile(
    userId: string,
    currentName: string,
    input: z.infer<typeof updateProfileSchema>,
  ): Promise<ProfileRecord> {
    if (input.name && input.name !== currentName) {
      await this.db.pool.query(
        "UPDATE users SET name = $1, updated_at = now() WHERE id = $2",
        [input.name.replace(/\s+/g, " "), userId],
      );
    }

    if (input.alias) {
      const aliasCheck = await this.db.pool.query(
        "SELECT user_id FROM profiles WHERE alias = $1 AND user_id != $2",
        [input.alias, userId],
      );
      if (aliasCheck.rows.length > 0) {
        problem(
          409,
          "alias_already_exists",
          "El alias ya está en uso por otro creador.",
          [
            {
              field: "alias",
              code: "already_exists",
              message: "Este alias ya está en uso.",
            },
          ],
        );
      }
    }

    await this.db.pool.query(
      `INSERT INTO profiles (
         user_id, alias, description, location, avatar_url, cover_url, accent_color, social_links, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       ON CONFLICT (user_id) DO UPDATE SET
         alias = COALESCE($2, profiles.alias),
         description = COALESCE($3, profiles.description),
         location = COALESCE($4, profiles.location),
         avatar_url = COALESCE($5, profiles.avatar_url),
         cover_url = COALESCE($6, profiles.cover_url),
         accent_color = COALESCE($7, profiles.accent_color),
         social_links = COALESCE($8, profiles.social_links),
         updated_at = now()`,
      [
        userId,
        input.alias ?? null,
        input.description ?? null,
        input.location ?? null,
        input.avatarUrl ?? null,
        input.coverUrl ?? null,
        input.accentColor ?? null,
        input.socialLinks ? JSON.stringify(input.socialLinks) : null,
      ],
    );

    const userRes = await this.db.pool.query(
      "SELECT name, email FROM users WHERE id = $1",
      [userId],
    );
    const updatedUser = userRes.rows[0];

    return this.getOrCreateMyProfile(
      userId,
      updatedUser?.name || currentName,
      updatedUser?.email || "",
    );
  }

  async getPublicProfile(alias: string) {
    const profileRes = await this.db.pool.query(
      `SELECT p.user_id AS "userId", p.alias, u.name, u.email,
              p.description, p.location, p.avatar_url AS "avatarUrl",
              p.cover_url AS "coverUrl", p.accent_color AS "accentColor",
              p.social_links AS "socialLinks",
              (u.verified_at IS NOT NULL) AS "verified",
              p.created_at AS "createdAt", p.updated_at AS "updatedAt"
       FROM profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.alias = $1 AND u.suspended_at IS NULL`,
      [alias],
    );

    if (profileRes.rows.length === 0) {
      problem(404, "profile_not_found", "Creador no encontrado.");
    }

    const row = profileRes.rows[0];

    // Obtener productos recomendados
    const productsRes = await this.db.pool.query(
      `SELECT p.id, p.title, p.description, p.category_id AS "categoryId",
              c.name AS "categoryName", p.platform,
              p.price_cents::text AS "priceCents",
              p.original_price_cents::text AS "originalPriceCents",
              p.discount_percentage AS "discountPercentage",
              p.currency, p.image_url AS "imageUrl",
              p.affiliate_url AS "affiliateUrl",
              p.rating, p.reviews_count AS "reviewsCount",
              p.status, p.is_demo AS "isDemo"
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'active'
       ORDER BY p.rating DESC, p.created_at DESC
       LIMIT 50`,
    );

    const products = productsRes.rows;

    // Calcular estadísticas, categorías y conteos
    const categoryCounts: Record<string, { id: string; nombre: string; count: number }> = {};
    const platformCounts: Record<string, number> = { amazon: 0, mercadolibre: 0 };
    const priceRanges = [
      { id: "menos-500", etiqueta: "Menos de $500", min: 0, max: 50000, count: 0 },
      { id: "500-1000", etiqueta: "$500 - $1,000", min: 50000, max: 100000, count: 0 },
      { id: "1000-3000", etiqueta: "$1,000 - $3,000", min: 100000, max: 300000, count: 0 },
      { id: "mas-3000", etiqueta: "Más de $3,000", min: 300000, max: Infinity, count: 0 },
    ];

    for (const p of products) {
      const catId = p.categoryId || "electronica";
      const catName = p.categoryName || catId;
      if (!categoryCounts[catId]) {
        categoryCounts[catId] = { id: catId, nombre: catName, count: 0 };
      }
      categoryCounts[catId].count++;

      if (p.platform === "amazon" || p.platform === "mercadolibre") {
        platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
      }

      const price = Number(p.priceCents) || 0;
      for (const range of priceRanges) {
        if (price >= range.min && price < range.max) {
          range.count++;
          break;
        }
      }
    }

    const categorias = Object.values(categoryCounts).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      productos: c.count,
    }));

    const conteoPrecios = priceRanges.map((r) => ({
      id: r.id,
      etiqueta: r.etiqueta,
      productos: r.count,
    }));

    const miembroDesde = formatMemberSince(new Date(row.createdAt));

    return {
      profile: {
        alias: row.alias,
        nombre: row.name,
        avatar: row.avatarUrl || "/img/afiliado/carlos.png",
        coverUrl: row.coverUrl || "/img/hero-banner.jpg",
        verificado: Boolean(row.verified),
        descripcion: row.description || "",
        redes: Array.isArray(row.socialLinks) ? row.socialLinks : [],
        ubicacion: row.location || "México",
        miembroDesde,
        estadisticas: {
          seguidores: "1.2K",
          productos: products.length,
          colecciones: 4,
          valoracion: 4.8,
        },
        categorias,
        conteoPlataformas: platformCounts,
        conteoPrecios,
        accentColor: row.accentColor || "#4338ca",
      },
      products,
      collections: [
        {
          id: "mejores-gadgets-2024",
          titulo: "Mejores gadgets 2024",
          productos: 12,
          imagen: "/img/colecciones/gadgets.png",
        },
        {
          id: "esenciales-hogar",
          titulo: "Esenciales para el hogar",
          productos: 8,
          imagen: "/img/colecciones/hogar.png",
        },
        {
          id: "regalos-originales",
          titulo: "Regalos originales",
          productos: 10,
          imagen: "/img/colecciones/regalos.png",
        },
        {
          id: "setup-oficina",
          titulo: "Setup de oficina",
          productos: 9,
          imagen: "/img/colecciones/oficina.png",
        },
      ],
    };
  }

  async getMyAnalytics(userId: string) {
    // 1. Total clics y productos únicos en los últimos 30 días
    const last30Res = await this.db.pool.query(
      `SELECT count(*)::int AS clics,
              count(DISTINCT product_id)::int AS "productosVistos"
       FROM click_events
       WHERE creator_id = $1 AND created_at >= now() - interval '30 days'`,
      [userId],
    );
    const totalClics = last30Res.rows[0]?.clics ?? 0;
    const productosVistos = last30Res.rows[0]?.productosVistos ?? 0;

    // 2. Clics en el periodo previo (hace 30 a 60 días) para calcular variación
    const prev30Res = await this.db.pool.query(
      `SELECT count(*)::int AS clics
       FROM click_events
       WHERE creator_id = $1
         AND created_at >= now() - interval '60 days'
         AND created_at < now() - interval '30 days'`,
      [userId],
    );
    const prevClics = prev30Res.rows[0]?.clics ?? 0;
    const variacionPorcentaje =
      prevClics > 0
        ? Math.round(((totalClics - prevClics) / prevClics) * 100)
        : totalClics > 0
          ? 100
          : 0;

    // Ganancia estimada: comisión estimada en centavos por cada clic convertido (~$27.70 MXN por cada 10 clics)
    const gananciaCentavos = Math.round((totalClics * 27700) / 10);

    // 3. Serie diaria de clics para los últimos 30 días
    const dailyRes = await this.db.pool.query(
      `WITH days AS (
         SELECT generate_series(
           date_trunc('day', now() - interval '29 days'),
           date_trunc('day', now()),
           interval '1 day'
         ) AS dia_fecha
       )
       SELECT
         to_char(d.dia_fecha, 'YYYY-MM-DD') AS fecha,
         COALESCE(c.conteo, 0)::int AS clics
       FROM days d
       LEFT JOIN (
         SELECT
           date_trunc('day', created_at) AS dia_fecha,
           count(*)::int AS conteo
         FROM click_events
         WHERE creator_id = $1
           AND created_at >= date_trunc('day', now() - interval '29 days')
         GROUP BY 1
       ) c ON c.dia_fecha = d.dia_fecha
       ORDER BY d.dia_fecha ASC`,
      [userId],
    );

    const dailyClicks = dailyRes.rows.map((row, idx) => ({
      dia: idx + 1,
      clics: row.clics,
      fecha: row.fecha,
    }));

    // 4. Clics por producto
    const prodRes = await this.db.pool.query(
      `SELECT product_id AS "productId", count(*)::int AS clics
       FROM click_events
       WHERE creator_id = $1
       GROUP BY product_id`,
      [userId],
    );

    const productClicks: Record<string, number> = {};
    for (const r of prodRes.rows) {
      productClicks[r.productId] = r.clics;
    }

    return {
      summary: {
        clics: totalClics,
        productosVistos,
        gananciaCentavos,
        variacionPorcentaje,
      },
      dailyClicks,
      productClicks,
    };
  }
}

@Controller("api/profiles")
export class ProfilesController {
  constructor(
    private readonly profiles: ProfilesService,
    private readonly auth: AuthService,
  ) {}

  @Get("me")
  async getMe(@Req() request: FastifyRequest) {
    const user = await this.auth.user(request);
    return this.profiles.getOrCreateMyProfile(user.id, user.name, user.email);
  }

  @Get("me/analytics")
  async getMyAnalytics(@Req() request: FastifyRequest) {
    const user = await this.auth.user(request);
    return this.profiles.getMyAnalytics(user.id);
  }

  @Put("me")
  async updateMe(@Req() request: FastifyRequest) {
    this.auth.csrf(request);
    const user = await this.auth.user(request);

    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      problem(
        422,
        "validation_failed",
        "Revisa los campos del perfil.",
        fieldErrors(parsed.error),
      );
    }

    return this.profiles.updateProfile(user.id, user.name, parsed.data);
  }

  @Get(":alias")
  async getByAlias(@Param("alias") alias: string) {
    if (!aliasRegex.test(alias)) {
      problem(404, "profile_not_found", "Creador no encontrado.");
    }
    return this.profiles.getPublicProfile(alias);
  }
}
