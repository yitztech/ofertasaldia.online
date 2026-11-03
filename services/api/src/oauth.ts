import { All, Controller, Get, HttpException, Param, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import { Database } from "./database.js";
import { AuthService, problem } from "./auth.js";
import { uuidv7 } from "./uuid.js";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const issuers = {
  google: "https://accounts.google.com",
  apple: "https://appleid.apple.com",
} as const;
type Provider = keyof typeof issuers;
function provider(value: string): Provider {
  if (value !== "google" && value !== "apple")
    problem(404, "not_found", "Proveedor no disponible.");
  return value;
}
function settings(value: Provider) {
  const prefix = value.toUpperCase();
  const id = process.env[`${prefix}_CLIENT_ID`];
  const secret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!id || !secret)
    problem(
      503,
      "oauth_unavailable",
      "Este acceso todavía no está configurado.",
    );
  const callback = `${process.env.SITE_URL}/api/auth/oauth/${value}/callback`;
  if (value === "apple" && !callback.startsWith("https://"))
    problem(503, "oauth_unavailable", "El acceso con Apple requiere HTTPS.");
  return { id, secret, callback };
}
async function configuration(value: Provider) {
  const client = await import("openid-client");
  const { id, secret } = settings(value);
  const config = await client.discovery(
    new URL(issuers[value]),
    id,
    { client_secret: secret },
    client.ClientSecretPost(secret),
    { timeout: 10 },
  );
  client.enableNonRepudiationChecks(config);
  return { client, config };
}

function failOAuth(
  reply: FastifyReply,
  cookieName: string,
  wantsHtml: boolean,
  status: number,
  code: string,
  message: string,
): never {
  reply.clearCookie(cookieName, { path: "/" });
  if (wantsHtml) {
    reply.code(302).redirect(`/entrar?error=${encodeURIComponent(code)}`);
    throw new HttpException("redirected", 302);
  }
  problem(status, code, message);
}

@Controller("api/auth/oauth")
export class OAuthController {
  constructor(
    private readonly db: Database,
    private readonly auth: AuthService,
  ) {}
  @Get(":provider")
  async start(
    @Param("provider") requested: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const value = provider(requested);
    const { callback } = settings(value);
    await this.auth.rateLimit(request);
    const { client, config } = await configuration(value);
    const state = client.randomState();
    const nonce = client.randomNonce();
    const verifier = client.randomPKCECodeVerifier();
    const binding = randomBytes(32).toString("base64url");
    await this.db.pool.query("DELETE FROM oauth_flows WHERE expires_at<now()");
    await this.db.pool.query(
      `INSERT INTO oauth_flows(state_hash,provider,binding_hash,nonce,verifier,expires_at) VALUES ($1,$2,$3,$4,$5,now()+interval '10 minutes')`,
      [digest(state), value, digest(binding), nonce, verifier],
    );
    reply.setCookie(this.flowCookie(), binding, {
      path: "/",
      httpOnly: true,
      secure: value === "apple" || process.env.NODE_ENV === "production",
      sameSite: value === "apple" ? "none" : "lax",
      maxAge: 600,
    });
    const params: Record<string, string> = {
      redirect_uri: callback,
      response_type: "code",
      scope: "openid email",
      state,
      nonce,
    };
    if (value === "google") {
      params.scope = "openid email profile";
      params.code_challenge = await client.calculatePKCECodeChallenge(verifier);
      params.code_challenge_method = "S256";
    } else params.response_mode = "form_post";
    return reply
      .code(302)
      .redirect(client.buildAuthorizationUrl(config, params).href);
  }
  private flowCookie() {
    return process.env.NODE_ENV === "production" ? "__Host-oauth" : "oauth";
  }
  @All(":provider/callback")
  async callback(
    @Param("provider") requested: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const value = provider(requested);
    const { callback } = settings(value);
    const wantsHtml =
      typeof request.headers.accept === "string" &&
      request.headers.accept.includes("text/html");
    const cookieName = this.flowCookie();
    function fail(status: number, code: string, message: string): never {
      return failOAuth(reply, cookieName, wantsHtml, status, code, message);
    }

    if (
      (value === "google" && request.method !== "GET") ||
      (value === "apple" && request.method !== "POST")
    ) {
      fail(405, "method_not_allowed", "Método no permitido.");
    }
    const input = (request.method === "POST" ? request.body : request.query) as
      | Record<string, unknown>
      | undefined;
    if (
      !input ||
      typeof input.state !== "string" ||
      input.state.length > 200 ||
      typeof input.code !== "string" ||
      input.code.length > 4096
    ) {
      fail(
        400,
        "invalid_oauth_response",
        "La respuesta del proveedor no es válida.",
      );
    }
    const binding = request.cookies[this.flowCookie()];
    if (!binding || binding.length > 100) {
      fail(
        400,
        "invalid_oauth_state",
        "El acceso ha vencido. Inténtalo de nuevo.",
      );
    }
    const result = await this.db.pool.query(
      `DELETE FROM oauth_flows WHERE state_hash=$1 AND provider=$2 AND binding_hash=$3 AND expires_at>now() RETURNING nonce,verifier`,
      [digest(input.state), value, digest(binding)],
    );
    if (!result.rows[0]) {
      fail(
        400,
        "invalid_oauth_state",
        "El acceso ha vencido. Inténtalo de nuevo.",
      );
    }
    reply.clearCookie(this.flowCookie(), { path: "/" });
    let claims;
    try {
      const { client, config } = await configuration(value);
      const url = new URL(callback);
      const params = new URLSearchParams({
        state: input.state,
        code: input.code,
      });
      let response: URL | Request = url;
      if (value === "apple")
        response = new Request(url, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: params,
        });
      else url.search = params.toString();
      const tokens = await client.authorizationCodeGrant(config, response, {
        expectedState: input.state,
        expectedNonce: result.rows[0].nonce,
        ...(value === "google"
          ? { pkceCodeVerifier: result.rows[0].verifier }
          : {}),
        idTokenExpected: true,
      });
      claims = tokens.claims();
    } catch {
      fail(
        401,
        "invalid_oauth_identity",
        "No se pudo verificar tu identidad. Inténtalo de nuevo.",
      );
    }
    if (
      !claims ||
      typeof claims.sub !== "string" ||
      claims.sub.length > 255 ||
      typeof claims.email !== "string" ||
      claims.email.length > 254 ||
      ![true, "true"].includes(claims.email_verified as boolean | string)
    ) {
      fail(
        401,
        "unverified_email",
        "El proveedor debe verificar tu correo.",
      );
    }
    const connection = await this.db.pool.connect();
    let userId: string;
    const session = randomBytes(32).toString("base64url");
    try {
      await connection.query("BEGIN");
      // Serialize the same identity and email without linking by email automatically.
      await connection.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [claims.email.toLowerCase()],
      );
      const identity = await connection.query(
        `SELECT u.id,u.suspended_at FROM identity_providers i JOIN users u ON u.id=i.user_id WHERE i.provider=$1 AND i.subject=$2 FOR UPDATE OF u`,
        [value, claims.sub],
      );
      if (identity.rows[0]) {
        if (identity.rows[0].suspended_at) {
          fail(403, "account_suspended", "La cuenta no está disponible.");
        }
        userId = identity.rows[0].id;
      } else {
        const existing = await connection.query(
          "SELECT id FROM users WHERE lower(email)=lower($1)",
          [claims.email],
        );
        if (existing.rows[0]) {
          fail(
            409,
            "account_link_required",
            "Ya existe una cuenta con ese correo. Accede con su método original.",
          );
        }
        userId = uuidv7();
        // Provider names are optional and not trusted as validated personal names.
        await connection.query(
          `INSERT INTO users(id,name,email,verified_at) VALUES ($1,'Usuario',$2,now())`,
          [userId, claims.email.toLowerCase()],
        );
        await connection.query(
          "INSERT INTO identity_providers(provider,subject,user_id) VALUES ($1,$2,$3)",
          [value, claims.sub, userId],
        );
      }
      await connection.query(
        `INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '7 days')`,
        [digest(session), userId],
      );
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
    reply.setCookie(this.auth.cookieName(), session, {
      ...this.auth.cookieOptions(),
      maxAge: 604800,
    });
    return reply.code(302).redirect("/");
  }
}
