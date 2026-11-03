import {
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Post,
  Req,
  Res,
  HttpException,
} from "@nestjs/common";
import type { FastifyRequest, FastifyReply } from "fastify";
import { randomBytes, createHash } from "node:crypto";
import { hash, verify } from "argon2";
import { z } from "zod";
import { Database } from "./database.js";
import { MailService } from "./mail.js";
import { uuidv7 } from "./uuid.js";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const credentials = z
  .object({ email: z.email().max(254), password: z.string().min(1).max(128) })
  .strict();
export function problem(
  status: number,
  code: string,
  detail: string,
  errors?: FieldError[],
): never {
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
      errors,
    },
    status,
  );
}
export type FieldError = { field: string; code: string; message: string };
const fieldMessages: Record<string, string> = {
  invalid_characters: "Contiene caracteres no permitidos.",
  too_long: "Supera la longitud máxima.",
  too_short: "Es demasiado corto.",
  invalid_format: "El formato no es válido.",
  required: "Es obligatorio.",
  unknown_field: "Campo no permitido.",
};
/** Convierte los errores de zod en `errors[]` de Problem Details (AGENTS §22). */
export function fieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.flatMap((issue) => {
    const unknown =
      issue.code === "unrecognized_keys" ? (issue.keys as string[]) : null;
    if (unknown)
      return unknown.map((key) => ({
        field: key,
        code: "unknown_field",
        message: fieldMessages.unknown_field,
      }));
    const field = issue.path.join(".");
    const code =
      issue.code === "too_big"
        ? "too_long"
        : issue.code === "too_small"
          ? "too_short"
          : issue.code === "invalid_type"
            ? "required"
            : field === "name" && issue.code === "invalid_format"
              ? "invalid_characters"
              : "invalid_format";
    return [{ field, code, message: fieldMessages[code] }];
  });
}
// Argon2id con los mínimos de OWASP (19 MiB, t=2, p=1) y a lo sumo dos hashes a la
// vez: el contenedor de la API tiene 384 MB y cada hash reserva su memoria.
const argonOptions = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
let argonActive = 0;
const argonWaiting: Array<() => void> = [];
async function withArgon<T>(work: () => Promise<T>): Promise<T> {
  if (argonActive >= 2)
    await new Promise<void>((resolve) => argonWaiting.push(resolve));
  argonActive++;
  try {
    return await work();
  } finally {
    argonActive--;
    argonWaiting.shift()?.();
  }
}
const hashPassword = (password: string) =>
  withArgon(() => hash(password, argonOptions));
const verifyPassword = (stored: string, password: string) =>
  withArgon(() => verify(stored, password));
// Hash de relleno para igualar el tiempo si la cuenta no existe: se calcula una vez.
let fallbackHash: Promise<string> | undefined;
const dummyHash = () =>
  (fallbackHash ??= hashPassword(randomBytes(32).toString("hex")));
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
      `SELECT u.id,u.name,u.email,u.role,u.verified_at AS "verifiedAt" FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND s.last_seen_at>now()-interval '24 hours' AND u.suspended_at IS NULL`,
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
      verifiedAt: string | null;
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
  getIp(request: FastifyRequest): string {
    const header = request.headers["x-real-ip"];
    return (typeof header === "string" ? header.trim() : "") || request.ip;
  }
  async rateLimit(request: FastifyRequest, account?: string) {
    const ip = this.getIp(request);
    const keys = [ip, ...(account ? [`${ip}:${account.toLowerCase()}`] : [])];
    for (const key of keys) {
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
  async checkLoginRateLimit(request: FastifyRequest, account: string) {
    const ip = this.getIp(request);
    for (const key of [ip, `${ip}:${account.toLowerCase()}`]) {
      const result = await this.db.pool.query(
        `SELECT attempts, window_start FROM auth_attempts WHERE key=$1`,
        [digest(key)],
      );
      if (result.rows[0]) {
        const isFresh =
          Date.now() - new Date(result.rows[0].window_start).getTime() <
          15 * 60 * 1000;
        if (isFresh && result.rows[0].attempts >= 20) {
          problem(
            429,
            "rate_limited",
            "Espera 15 minutos antes de intentarlo nuevamente.",
          );
        }
      }
    }
  }
  async recordFailedLogin(request: FastifyRequest, account: string) {
    await this.rateLimit(request, account);
  }
  async clearLoginFailures(request: FastifyRequest, account: string) {
    const ip = this.getIp(request);
    await this.db.pool.query("DELETE FROM auth_attempts WHERE key=$1", [
      digest(`${ip}:${account.toLowerCase()}`),
    ]);
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
      problem(
        422,
        "validation_failed",
        "Revisa el correo electrónico.",
        fieldErrors(parsed.error),
      );
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
      problem(
        422,
        "validation_failed",
        "Revisa el enlace y la contraseña.",
        fieldErrors(parsed.error),
      );
    await this.auth.rateLimit(request);
    const passwordHash = await hashPassword(parsed.data.password);
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
  async register(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
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
        fieldErrors(parsed.error),
      );
    await this.auth.rateLimit(request, parsed.data.email);
    const passwordHash = await hashPassword(parsed.data.password);
    const id = uuidv7();
    const result = await this.db.pool.query(
      `INSERT INTO users(id,name,email,password_hash) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING id`,
      [
        id,
        parsed.data.name.replace(/\s+/g, " "),
        parsed.data.email.toLowerCase(),
        passwordHash,
      ],
    );
    if (!result.rows[0]) {
      problem(
        409,
        "account_already_exists",
        "Ya existe una cuenta con este correo electrónico.",
        [
          {
            field: "email",
            code: "already_exists",
            message: "Ya existe una cuenta con este correo.",
          },
        ],
      );
    }
    const verificationToken = randomBytes(32).toString("base64url");
    await this.db.pool.query(
      `INSERT INTO email_verification_tokens(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '24 hours')`,
      [digest(verificationToken), result.rows[0].id],
    );
    await this.mail.send(
      parsed.data.email.toLowerCase(),
      "Verifica tu correo electrónico",
      `Hola ${parsed.data.name.replace(/\s+/g, " ")},\n\nGracias por unirte a OfertasAlDía. Para verificar tu dirección de correo electrónico, usa el siguiente enlace:\n\n${process.env.SITE_URL}/verificar#token=${verificationToken}\n\nEl enlace vence en 24 horas.`,
    );

    const token = randomBytes(32).toString("base64url");
    await this.db.pool.query(
      `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '7 days')`,
      [digest(token), result.rows[0].id],
    );
    reply.setCookie(this.auth.cookieName(), token, {
      ...this.auth.cookieOptions(),
      maxAge: 604800,
    });
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
      problem(
        422,
        "validation_failed",
        "Revisa el correo y la contraseña.",
        fieldErrors(parsed.error),
      );
    await this.auth.checkLoginRateLimit(request, parsed.data.email);
    const result = await this.db.pool.query(
      "SELECT id,password_hash FROM users WHERE lower(email)=lower($1) AND suspended_at IS NULL",
      [parsed.data.email],
    );
    const user = result.rows[0];
    const passwordValid =
      user && (await verifyPassword(user.password_hash, parsed.data.password));
    if (!passwordValid || !user) {
      if (!user) await dummyHash();
      await this.auth.recordFailedLogin(request, parsed.data.email);
      problem(401, "invalid_credentials", "Correo o contraseña incorrectos.");
    }
    await this.auth.clearLoginFailures(request, parsed.data.email);
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
  @Post("verify-email")
  @HttpCode(200)
  async verifyEmail(@Body() body: unknown, @Req() request: FastifyRequest) {
    this.auth.csrf(request);
    const parsed = z
      .object({
        token: z.string().length(43),
      })
      .strict()
      .safeParse(body);
    if (!parsed.success) {
      problem(
        422,
        "validation_failed",
        "Revisa el enlace de verificación.",
        fieldErrors(parsed.error),
      );
    }
    await this.auth.rateLimit(request);
    const client = await this.db.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        "DELETE FROM email_verification_tokens WHERE token_hash=$1 AND expires_at>now() RETURNING user_id",
        [digest(parsed.data.token)],
      );
      if (!result.rows[0]) {
        problem(
          422,
          "invalid_token",
          "El enlace de verificación no es válido o ha vencido.",
        );
      }
      await client.query(
        "UPDATE users SET verified_at=now(), updated_at=now() WHERE id=$1",
        [result.rows[0].user_id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return { status: "ok" };
  }
  @Post("resend-verification")
  @HttpCode(200)
  async resendVerification(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
  ) {
    this.auth.csrf(request);
    const parsed = z
      .object({ email: z.email().max(254) })
      .strict()
      .safeParse(body);
    if (!parsed.success) {
      problem(
        422,
        "validation_failed",
        "Revisa el correo electrónico.",
        fieldErrors(parsed.error),
      );
    }
    await this.auth.rateLimit(request, parsed.data.email);
    const userRes = await this.db.pool.query(
      "SELECT id, name, email, verified_at FROM users WHERE lower(email)=lower($1) AND suspended_at IS NULL",
      [parsed.data.email],
    );
    const user = userRes.rows[0];
    if (user && !user.verified_at) {
      const token = randomBytes(32).toString("base64url");
      await this.db.pool.query(
        "DELETE FROM email_verification_tokens WHERE user_id=$1",
        [user.id],
      );
      await this.db.pool.query(
        `INSERT INTO email_verification_tokens(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '24 hours')`,
        [digest(token), user.id],
      );
      await this.mail.send(
        user.email,
        "Verifica tu correo electrónico",
        `Hola ${user.name},\n\nPara verificar tu dirección de correo electrónico, usa el siguiente enlace:\n\n${process.env.SITE_URL}/verificar#token=${token}\n\nEl enlace vence en 24 horas.`,
      );
    }
    return { status: "ok" };
  }
}
