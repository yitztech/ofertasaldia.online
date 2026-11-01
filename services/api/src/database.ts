import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import { Pool } from "pg";

export const CURRENT_SCHEMA_VERSION = 7;

@Injectable()
export class Database implements OnApplicationShutdown {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 500,
    statement_timeout: 500,
  });

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
