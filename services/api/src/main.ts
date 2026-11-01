import { Problems } from "./problems";
import { AdminController } from "./admin";
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
import { Database, CURRENT_SCHEMA_VERSION } from "./database";
import { migrate } from "./migrations";
import { CatalogController } from "./catalog.controller";
import cookie from "@fastify/cookie";
import { AuthController, AuthService } from "./auth";
import { MailService } from "./mail";
import { OAuthController } from "./oauth";

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
  ],
  providers: [Database, AuthService, MailService],
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
    { logger: new ConsoleLogger({ json: true }) },
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
