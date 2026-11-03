import { Body, Controller, Get, HttpCode, Param, Post, Query, Req } from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { z } from "zod";
import { AuthService, problem } from "./auth.js";
import { Database } from "./database.js";
import { MaintenanceService } from "./maintenance.js";
import { uuidv7 } from "./uuid.js";
const idSchema = z.uuid();
function filters(query: unknown) {
  const parsed = z
    .object({
      q: z.string().max(100).optional(),
      cursor: z.string().max(100).optional(),
    })
    .strict()
    .safeParse(query);
  if (!parsed.success) problem(422, "validation_failed", "Filtros no válidos.");
  const id = parsed.data.cursor
    ? Buffer.from(parsed.data.cursor, "base64url").toString()
    : null;
  if (id && !idSchema.safeParse(id).success)
    problem(422, "validation_failed", "Cursor no válido.");
  return { q: parsed.data.q ?? "", cursor: id };
}
function page(items: Record<string, unknown>[]) {
  return {
    items: items.slice(0, 20),
    nextCursor:
      items.length > 20
        ? Buffer.from(String(items[19].id)).toString("base64url")
        : null,
  };
}
@Controller("api/admin")
export class AdminController {
  constructor(
    private readonly db: Database,
    private readonly auth: AuthService,
    private readonly maintenance: MaintenanceService,
  ) {}
  private async admin(request: FastifyRequest) {
    const user = await this.auth.user(request);
    if (user.role !== "admin")
      problem(403, "forbidden", "No tienes permiso para acceder.");
    return user;
  }
  @Get("stats") async stats(@Req() request: FastifyRequest) {
    await this.admin(request);
    return (
      await this.db.pool.query(
        `SELECT (SELECT count(*)::int FROM users) AS users,(SELECT count(*)::int FROM products) AS products,(SELECT count(DISTINCT user_id)::int FROM subscriptions WHERE starts_at<=now() AND expires_at>now() AND revoked_at IS NULL) AS subscribers`,
      )
    ).rows[0];
  }
  @Get("users") async users(
    @Req() request: FastifyRequest,
    @Query() query: unknown,
  ) {
    await this.admin(request);
    const f = filters(query);
    return page(
      (
        await this.db.pool.query(
          `SELECT u.id,u.name,u.email,u.role,u.suspended_at AS "suspendedAt",(SELECT max(expires_at) FROM subscriptions WHERE user_id=u.id AND starts_at<=now() AND expires_at>now() AND revoked_at IS NULL) AS "planExpiresAt" FROM users u WHERE ($1='' OR strpos(lower(u.name||' '||u.email),lower($1))>0) AND ($2::uuid IS NULL OR u.id>$2) ORDER BY u.id LIMIT 21`,
          [f.q, f.cursor],
        )
      ).rows,
    );
  }
  @Get("products") async products(
    @Req() request: FastifyRequest,
    @Query() query: unknown,
  ) {
    await this.admin(request);
    const f = filters(query);
    return page(
      (
        await this.db.pool.query(
          `SELECT id,title,platform,category_id AS "categoryId",is_demo AS "isDemo" FROM products WHERE ($1='' OR strpos(lower(title),lower($1))>0) AND ($2::uuid IS NULL OR id>$2) ORDER BY id LIMIT 21`,
          [f.q, f.cursor],
        )
      ).rows,
    );
  }
  @Get("audit") async audit(
    @Req() request: FastifyRequest,
    @Query() query: unknown,
  ) {
    await this.admin(request);
    const f = filters(query);
    return page(
      (
        await this.db.pool.query(
          `SELECT a.id,a.action,a.target_id AS "targetId",a.created_at AS "createdAt",u.email AS "actorEmail" FROM admin_audit a JOIN users u ON u.id=a.actor_id WHERE ($1='' OR strpos(a.action,$1)>0) AND ($2::uuid IS NULL OR a.id>$2) ORDER BY a.id LIMIT 21`,
          [f.q, f.cursor],
        )
      ).rows,
    );
  }
  @Get("coupons") async coupons(
    @Req() request: FastifyRequest,
    @Query() query: unknown,
  ) {
    await this.admin(request);
    const f = filters(query);
    return page(
      (
        await this.db.pool.query(
          `SELECT id, code, description, discount_type AS "discountType",
                  discount_value AS "discountValue", max_redemptions AS "maxRedemptions",
                  times_redeemed AS "timesRedeemed", active, expires_at AS "expiresAt",
                  created_at AS "createdAt"
           FROM promo_coupons
           WHERE ($1='' OR strpos(lower(code||' '||description),lower($1))>0)
             AND ($2::uuid IS NULL OR id>$2)
           ORDER BY id LIMIT 21`,
          [f.q, f.cursor],
        )
      ).rows,
    );
  }
  @Post("coupons")
  @HttpCode(201)
  async createCoupon(
    @Req() request: FastifyRequest,
    @Body() body: unknown,
  ) {
    this.auth.csrf(request);
    const actor = await this.admin(request);
    const parsed = z
      .object({
        code: z
          .string()
          .trim()
          .min(3)
          .max(40)
          .regex(/^[A-Za-z0-9_-]+$/),
        description: z.string().trim().min(3).max(150),
        discountType: z.enum(["percent", "amount_cents"]),
        discountValue: z.number().int().positive(),
        maxRedemptions: z.number().int().positive().nullable().optional(),
        expiresAt: z.iso.datetime().nullable().optional(),
      })
      .strict()
      .safeParse(body);

    if (!parsed.success) {
      problem(422, "validation_failed", "Datos del cupón no válidos.");
    }
    const d = parsed.data;
    if (d.discountType === "percent" && (d.discountValue < 1 || d.discountValue > 100)) {
      problem(422, "validation_failed", "El descuento porcentual debe estar entre 1 y 100.");
    }
    if (d.discountType === "amount_cents" && d.discountValue > 29900) {
      problem(422, "validation_failed", "El descuento en centavos no puede superar el precio del plan.");
    }

    const codeUpper = d.code.toUpperCase();
    const couponId = uuidv7();
    const c = await this.db.pool.connect();
    try {
      await c.query("BEGIN");
      const existing = await c.query(
        "SELECT id FROM promo_coupons WHERE upper(code) = $1",
        [codeUpper],
      );
      if (existing.rows.length > 0) {
        problem(409, "coupon_exists", "Ya existe un cupón con ese código.");
      }
      const inserted = await c.query(
        `INSERT INTO promo_coupons (
          id, code, description, discount_type, discount_value, max_redemptions, expires_at, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        RETURNING id, code, description, discount_type AS "discountType",
                  discount_value AS "discountValue", max_redemptions AS "maxRedemptions",
                  times_redeemed AS "timesRedeemed", active, expires_at AS "expiresAt",
                  created_at AS "createdAt"`,
        [
          couponId,
          codeUpper,
          d.description,
          d.discountType,
          d.discountValue,
          d.maxRedemptions ?? null,
          d.expiresAt ?? null,
        ],
      );
      await c.query(
        "INSERT INTO admin_audit(id,actor_id,action,target_id) VALUES ($1,$2,$3,$4)",
        [uuidv7(), actor.id, "coupon_created", couponId],
      );
      await c.query("COMMIT");
      return inserted.rows[0];
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  @Post("coupons/:id/toggle")
  @HttpCode(200)
  async toggleCoupon(
    @Req() request: FastifyRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.auth.csrf(request);
    const actor = await this.admin(request);
    const data = z.object({ active: z.boolean() }).strict().safeParse(body);
    if (!idSchema.safeParse(id).success || !data.success) {
      problem(422, "validation_failed", "Datos no válidos.");
    }
    const c = await this.db.pool.connect();
    try {
      await c.query("BEGIN");
      const res = await c.query(
        "UPDATE promo_coupons SET active = $2 WHERE id = $1 RETURNING id, active",
        [id, data.data.active],
      );
      if (!res.rows.length) {
        problem(404, "not_found", "Cupón no encontrado.");
      }
      await c.query(
        "INSERT INTO admin_audit(id,actor_id,action,target_id) VALUES ($1,$2,$3,$4)",
        [
          uuidv7(),
          actor.id,
          data.data.active ? "coupon_activated" : "coupon_deactivated",
          id,
        ],
      );
      await c.query("COMMIT");
      return { status: "ok", active: res.rows[0].active };
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  @Post("users/:id/suspension")
  @HttpCode(200)
  async suspend(
    @Req() request: FastifyRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.auth.csrf(request);
    const actor = await this.admin(request);
    const data = z.object({ suspended: z.boolean() }).strict().safeParse(body);
    if (!idSchema.safeParse(id).success || !data.success)
      problem(422, "validation_failed", "Datos no válidos.");

    if (id === actor.id && data.data.suspended) {
      problem(400, "cannot_suspend_self", "No puedes suspender tu propia cuenta.");
    }

    const c = await this.db.pool.connect();
    try {
      await c.query("BEGIN");
      const targetUser = await c.query(
        "SELECT id, role, suspended_at FROM users WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!targetUser.rows.length) {
        problem(404, "not_found", "Usuario no disponible.");
      }
      const target = targetUser.rows[0];

      if (target.role === "admin" && data.data.suspended) {
        const activeAdmins = await c.query(
          "SELECT count(*)::int AS count FROM users WHERE role='admin' AND suspended_at IS NULL AND id <> $1",
          [id],
        );
        if (activeAdmins.rows[0].count < 1) {
          problem(400, "last_admin_protection", "No se puede suspender al único administrador activo.");
        }
      }

      await c.query(
        `UPDATE users SET suspended_at=CASE WHEN $2 THEN now() ELSE NULL END,updated_at=now() WHERE id=$1`,
        [id, data.data.suspended],
      );
      if (data.data.suspended)
        await c.query("DELETE FROM sessions WHERE user_id=$1", [id]);
      await c.query(
        "INSERT INTO admin_audit(id,actor_id,action,target_id) VALUES ($1,$2,$3,$4)",
        [
          uuidv7(),
          actor.id,
          data.data.suspended ? "user_suspended" : "user_reactivated",
          id,
        ],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    return { status: "ok" };
  }
  @Post("users/:id/subscription")
  @HttpCode(200)
  async subscription(
    @Req() request: FastifyRequest,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    this.auth.csrf(request);
    const actor = await this.admin(request);
    const data = z
      .object({ expiresAt: z.iso.datetime() })
      .strict()
      .safeParse(body);
    if (
      !idSchema.safeParse(id).success ||
      !data.success ||
      new Date(data.data.expiresAt).getTime() <= Date.now()
    )
      problem(422, "validation_failed", "El vencimiento debe ser futuro.");
    const c = await this.db.pool.connect();
    try {
      await c.query("BEGIN");
      const u = await c.query(
        "SELECT id FROM users WHERE id=$1 AND suspended_at IS NULL FOR UPDATE",
        [id],
      );
      if (!u.rows.length) problem(404, "not_found", "Usuario no disponible.");
      await c.query(
        "UPDATE subscriptions SET revoked_at=now(),updated_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [id],
      );
      await c.query(
        "INSERT INTO subscriptions(id,user_id,starts_at,expires_at) VALUES ($1,$2,now(),$3)",
        [uuidv7(), id, data.data.expiresAt],
      );
      await c.query(
        "INSERT INTO admin_audit(id,actor_id,action,target_id) VALUES ($1,$2,$3,$4)",
        [uuidv7(), actor.id, "subscription_activated", id],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    return { status: "ok" };
  }
  @Post("maintenance/purge")
  @HttpCode(200)
  async purge(@Req() request: FastifyRequest) {
    const actor = await this.admin(request);
    this.auth.csrf(request);
    const purged = await this.maintenance.purgeExpiredRecords();
    await this.db.pool.query(
      "INSERT INTO admin_audit(id,actor_id,action,target_id) VALUES ($1,$2,$3,$4)",
      [uuidv7(), actor.id, "maintenance_purge", actor.id],
    );
    return { status: "ok", purged };
  }
}
