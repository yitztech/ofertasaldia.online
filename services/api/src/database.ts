import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Pool } from "pg";

export const CURRENT_SCHEMA_VERSION = 16;

function resolveConnectionString(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (
    process.env.POSTGRES_HOST &&
    process.env.POSTGRES_DB &&
    process.env.POSTGRES_APP_USER &&
    process.env.APP_DATABASE_PASSWORD
  ) {
    const dbUrl = new URL("postgres://localhost");
    dbUrl.hostname = process.env.POSTGRES_HOST;
    dbUrl.pathname = "/" + process.env.POSTGRES_DB;
    dbUrl.username = process.env.POSTGRES_APP_USER;
    dbUrl.password = process.env.APP_DATABASE_PASSWORD;
    return dbUrl.href;
  }
  return undefined;
}

@Injectable()
export class Database implements OnApplicationShutdown {
  readonly pool = new Pool({
    connectionString: resolveConnectionString(),
    max: 8,
    connectionTimeoutMillis: 2500,
    statement_timeout: 2000,
    idleTimeoutMillis: 30000,
  });

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
