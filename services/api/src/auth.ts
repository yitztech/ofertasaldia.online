import {
  Body,
  Controller,
  Get,
  Injectable,
  Post,
  Req,
  Res,
  HttpException,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { hash, verify } from "argon2";
import { z } from "zod";
import { Database } from "./database.js";
import { MailService } from "./mail.js";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const credentials = z
  .object({ email: z.email().max(254), password: z.string().min(1).max(128) })
  .strict();
export function problem(status: number, code: string, detail: string): never {
  throw new HttpException(
    {
      type: "about:blank",
      title:
        status === 401
          ? "Acceso requerido"
          : "No se pudo completar la solicitud",
      status,
      code,
      detail,
    },
    status,
  );
}
@Injectable()
export class AuthService {
  constructor(private readonly db: Database) {}
  csrf(request: FastifyRequest) {
    if (
      request.headers.origin !== process.env.SITE_URL ||
      request.headers["x-csrf"] !== "1"
    )
      problem(403, "invalid_origin", "Origen no permitido.");
  }
  async user(request: FastifyRequest) {
    const token = request.cookies[this.cookieName()];
    if (!token || token.length > 100)
      problem(401, "unauthenticated", "Inicia sesión.");
    const result = await this.db.pool.query(
      `SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND s.last_seen_at>now()-interval '24 hours' AND u.suspended_at IS NULL`,
      [digest(token)],
    );
    if (!result.rows[0]) problem(401, "unauthenticated", "Inicia sesión.");
    await this.db.pool.query(
      "UPDATE sessions SET last_seen_at=now() WHERE token_hash=$1",
      [digest(token)],
    );
    return result.rows[0] as {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
  cookieName() {
    return process.env.NODE_ENV === "production" ? "__Host-session" : "session";
  }
  cookieOptions() {
    return {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
    };
  }
  async rateLimit(request: FastifyRequest, account: string) {
    // Both keys are independently bounded; nginx overwrites the client IP header.
    for (const key of [
      String(request.headers["x-real-ip"] ?? request.ip),
      account.toLowerCase(),
    ]) {
      const result = await this.db.pool.query(
        `INSERT INTO auth_attempts(key,attempts,window_start) VALUES ($1,1,now()) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE auth_attempts.attempts+1 END,window_start=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING attempts`,
        [digest(key)],
      );
      if (result.rows[0].attempts > 20)
        problem(
          429,
          "rate_limited",
          "Espera 15 minutos antes de intentarlo nuevamente.",
        );
    }
  }
}
@Controller("api/auth")
export class AuthController {
  constructor(
    private readonly db: Database,
    private readonly auth: AuthService,
    private readonly mail: MailService,
  ) {}
  @Post("recover")
  async recover(@Body() body: unknown, @Req() request: FastifyRequest) {
    this.auth.csrf(request);
    const parsed = z
      .object({ email: z.email().max(254) })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      problem(422, "validation_failed", "Revisa el correo electrónico.");
    await this.auth.rateLimit(request, parsed.data.email);
    const result = await this.db.pool.query(
      "SELECT id,email FROM users WHERE lower(email)=lower($1) AND suspended_at IS NULL",
      [parsed.data.email],
    );
    if (result.rows[0]) {
      const token = randomBytes(32).toString("base64url");
      await this.db.pool.query(
        `INSERT INTO password_tokens(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '1 hour')`,
        [digest(token), result.rows[0].id],
      );
      await this.mail.send(
        result.rows[0].email,
        "Restablecer tu contraseña",
        `Usa este enlace para restablecer tu contraseña: ${process.env.SITE_URL}/restablecer#token=${token}\nEl enlace vence en una hora.`,
      );
    }
    return { status: "ok" };
  }
  @Post("reset")
  async reset(@Body() body: unknown, @Req() request: FastifyRequest) {
    this.auth.csrf(request);
    const parsed = z
      .object({
        token: z.string().length(43),
        password: z.string().min(8).max(128),
      })
      .strict()
      .safeParse(body);
    if (!parsed.success)
      problem(422, "validation_failed", "Revisa el enlace y la contraseña.");
    await this.auth.rateLimit(request, "reset");
    const passwordHash = await hash(parsed.data.password);
    const client = await this.db.pool.connect();
    let email: string;
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM password_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id",
        [digest(parsed.data.token)],
      );
      if (!result.rows[0])
        problem(422, "invalid_token", "El enlace no es válido o ha vencido.");
      const user = await client.query(
        "UPDATE users SET password_hash=$1,updated_at=now() WHERE id=$2 RETURNING email",
        [passwordHash, result.rows[0].user_id],
      );
      email = user.rows[0].email;
      await client.query("DELETE FROM sessions WHERE user_id=$1", [
        result.rows[0].user_id,
      ]);
      await client.query("DELETE FROM password_tokens WHERE user_id=$1", [
        result.rows[0].user_id,
      ]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await this.mail.send(
      email!,
      "Tu contraseña ha cambiado",
      "La contraseña de tu cuenta se actualizó. Si no solicitaste este cambio, contacta con soporte.",
    );
    return { status: "ok" };
  }
  @Get("me") me(@Req() request: FastifyRequest) {
    return this.auth.user(request);
  }
  @Post("register")
  async register(@Body() body: unknown, @Req() request: FastifyRequest) {
    this.auth.csrf(request);
    const schema = credentials
      .extend({
        name: z
          .string()
          .trim()
          .min(1)
          .max(50)
          .regex(/^[\p{L}\p{M}](?:[\p{L}\p{M} '’.-]*[\p{L}\p{M}.])?$/u),
        password: z.string().min(8).max(128),
        termsAccepted: z.literal(true),
      })
      .strict();
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      problem(
        422,
        "validation_failed",
        "Revisa el nombre, correo, contraseña y aceptación de términos.",
      );
    await this.auth.rateLimit(request, parsed.data.email);
    const passwordHash = await hash(parsed.data.password);
    await this.db.pool.query(
      `INSERT INTO users(id,name,email,password_hash) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [
        randomUUID(),
        parsed.data.name.replace(/\s+/g, " "),
        parsed.data.email.toLowerCase(),
        passwordHash,
      ],
    );
    return { status: "ok" };
  }
  @Post("login")
  async login(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.auth.csrf(request);
    const parsed = credentials.safeParse(body);
    if (!parsed.success)
      problem(422, "validation_failed", "Revisa el correo y la contraseña.");
    await this.auth.rateLimit(request, parsed.data.email);
    const result = await this.db.pool.query(
      "SELECT id,password_hash FROM users WHERE lower(email)=lower($1) AND suspended_at IS NULL",
      [parsed.data.email],
    );
    const user = result.rows[0];
    const fallback = await hash(randomBytes(32));
    if (
      !(await verify(user?.password_hash ?? fallback, parsed.data.password)) ||
      !user
    )
      problem(401, "invalid_credentials", "Correo o contraseña incorrectos.");
    const token = randomBytes(32).toString("base64url");
    await this.db.pool.query(
      `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '7 days')`,
      [digest(token), user.id],
    );
    reply.setCookie(this.auth.cookieName(), token, {
      ...this.auth.cookieOptions(),
      maxAge: 604800,
    });
    return { status: "ok" };
  }
  @Post("logout")
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.auth.csrf(request);
    const token = request.cookies[this.auth.cookieName()];
    if (token)
      await this.db.pool.query("DELETE FROM sessions WHERE token_hash=$1", [
        digest(token),
      ]);
    reply.clearCookie(this.auth.cookieName(), this.auth.cookieOptions());
    return { status: "ok" };
  }
}
