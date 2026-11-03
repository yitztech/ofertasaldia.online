import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Pool } from "pg";

export const CURRENT_SCHEMA_VERSION = 12;

@Injectable()
export class Database implements OnApplicationShutdown {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 8,
    connectionTimeoutMillis: 2500,
    statement_timeout: 2000,
    idleTimeoutMillis: 30000,
  });

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
