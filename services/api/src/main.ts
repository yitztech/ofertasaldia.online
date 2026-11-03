import { Problems } from "./problems.js";
import { AdminController } from "./admin.js";
import { uuidv7 } from "./uuid.js";
import "reflect-metadata";
import {
  Controller,
  Get,
  HttpException,
  Module,
  ConsoleLogger,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { Database, CURRENT_SCHEMA_VERSION } from "./database.js";
import { migrate } from "./migrations.js";
import { CatalogController } from "./catalog.controller.js";
import cookie from "@fastify/cookie";
import { AuthController, AuthService } from "./auth.js";
import { MailService } from "./mail.js";
import { MaintenanceService } from "./maintenance.js";
import { MeliSyncService } from "./meli.js";
import { OAuthController } from "./oauth.js";
import { PaymentsController, PaymentsService } from "./payments.js";
import { ArticlesController, ArticlesService } from "./articles.js";
import { ProfilesController, ProfilesService } from "./profiles.js";
import { RedirectController } from "./redirect.js";

@Controller()
class HealthController {
  constructor(private readonly db: Database) {}

  @Get("healthz")
  alive() {
    return { status: "ok" };
  }

  @Get("api/health")
  async ready() {
    try {
      const result = await this.db.pool.query<{ version: number }>(
        "SELECT max(version) AS version FROM schema_migrations",
      );
      if (result.rows[0]?.version !== CURRENT_SCHEMA_VERSION)
        throw new Error("schema version mismatch");
      return { status: "ok" };
    } catch {
      throw new HttpException({ status: "error" }, 503);
    }
  }
}

@Module({
  controllers: [
    HealthController,
    CatalogController,
    AuthController,
    AdminController,
    OAuthController,
    PaymentsController,
    ArticlesController,
    ProfilesController,
    RedirectController,
  ],
  providers: [
    Database,
    AuthService,
    MailService,
    MaintenanceService,
    MeliSyncService,
    PaymentsService,
    ArticlesService,
    ProfilesService,
  ],
})
class AppModule {}

async function bootstrap() {
  if (!process.env.DATABASE_URL) {
    for (const key of [
      "POSTGRES_HOST",
      "POSTGRES_DB",
      "POSTGRES_APP_USER",
      "APP_DATABASE_PASSWORD",
    ])
      if (!process.env[key]) throw new Error(`${key} es obligatoria`);
    const dbUrl = new URL("postgres://localhost");
    dbUrl.hostname = process.env.POSTGRES_HOST!;
    dbUrl.pathname = "/" + process.env.POSTGRES_DB!;
    dbUrl.username = process.env.POSTGRES_APP_USER!;
    dbUrl.password = process.env.APP_DATABASE_PASSWORD!;
    process.env.DATABASE_URL = dbUrl.href;
  }
  if (!process.env.SITE_URL) throw new Error("SITE_URL es obligatoria");
  const site = new URL(process.env.SITE_URL);
  if (
    site.origin !== process.env.SITE_URL ||
    !["http:", "https:"].includes(site.protocol)
  )
    throw new Error("SITE_URL debe ser un origen HTTP(S) sin ruta");
  if (process.env.NODE_ENV === "production" && site.protocol !== "https:")
    throw new Error("SITE_URL requiere HTTPS en producción");
  for (const provider of ["GOOGLE", "APPLE"]) {
    if (
      Boolean(process.env[`${provider}_CLIENT_ID`]) !==
      Boolean(process.env[`${provider}_CLIENT_SECRET`])
    )
      throw new Error(`Configura ambas variables OAuth de ${provider}`);
  }
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 1_048_576 }),
    { rawBody: true, logger: new ConsoleLogger({ json: true }) },
  );
  app.useGlobalFilters(new Problems());
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onSend", async (_request, reply, payload) => {
      reply
        .header("Cache-Control", "no-store")
        .header("Content-Language", "es-MX");
      return payload;
    });
  const fastify = app.getHttpAdapter().getInstance();
  // Identificador de petición (AGENTS §30): el que llega por X-Request-ID, si es válido, o uno nuevo.
  fastify.addHook("onRequest", async (request, reply) => {
    const header = request.headers["x-request-id"];
    const id =
      typeof header === "string" && /^[a-zA-Z0-9-]{1,64}$/.test(header)
        ? header
        : uuidv7();
    request.headers["x-request-id"] = id;
    reply.header("X-Request-ID", id);
  });
  // Una línea JSON por petición, sin la query ni datos personales.
  fastify.addHook("onResponse", async (request, reply) => {
    if (request.url.split("?")[0] === "/healthz") return;
    console.log(
      JSON.stringify({
        time: new Date().toISOString(),
        level: "info",
        msg: "request",
        requestId: request.headers["x-request-id"],
        method: request.method,
        path: request.url.split("?")[0],
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
      }),
    );
  });
  await app.register(cookie);
  try {
    await migrate(app.get(Database).pool);
  } catch (error) {
    await app.close();
    throw error;
  }
  app.enableShutdownHooks();
  await app.listen(3001, "0.0.0.0");
}

void bootstrap();
