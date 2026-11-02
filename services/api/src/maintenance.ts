import { Injectable, OnModuleInit, ConsoleLogger } from "@nestjs/common";
import { Database } from "./database.js";
import { MailService } from "./mail.js";

export interface PurgeResult {
  authAttempts: number;
  passwordTokens: number;
  sessions: number;
  oauthFlows: number;
}

@Injectable()
export class MaintenanceService implements OnModuleInit {
  private readonly logger = new ConsoleLogger(MaintenanceService.name);

  constructor(
    private readonly db: Database,
    private readonly mail: MailService,
  ) {}

  async onModuleInit() {
    // 1. Ejecutar purga inicial al arrancar el servicio
    try {
      const result = await this.purgeExpiredRecords();
      this.logger.log(
        JSON.stringify({
          msg: "initial_maintenance_purge_completed",
          ...result,
        }),
      );
    } catch (err) {
      this.logger.error("Error en purga inicial de mantenimiento", err);
    }

    // 2. Registrar tarea programada recurrente cada hora con pg-boss
    if (this.mail?.queue) {
      try {
        await this.mail.queue.createQueue("maintenance-purge");
        await this.mail.queue.schedule("maintenance-purge", "0 * * * *");
        await this.mail.queue.work("maintenance-purge", async () => {
          const result = await this.purgeExpiredRecords();
          this.logger.log(
            JSON.stringify({
              msg: "scheduled_maintenance_purge_completed",
              ...result,
            }),
          );
        });
      } catch (err) {
        this.logger.error(
          "Error al registrar schedule de mantenimiento en pg-boss",
          err,
        );
      }
    }
  }

  async purgeExpiredRecords(): Promise<PurgeResult> {
    const client = await this.db.pool.connect();
    try {
      const authAttempts = await client.query(
        "DELETE FROM auth_attempts WHERE window_start < now() - interval '2 hours'",
      );
      const passwordTokens = await client.query(
        "DELETE FROM password_tokens WHERE expires_at < now()",
      );
      const sessions = await client.query(
        "DELETE FROM sessions WHERE expires_at < now() OR last_seen_at < now() - interval '24 hours'",
      );
      const oauthFlows = await client.query(
        "DELETE FROM oauth_flows WHERE expires_at < now()",
      );
      return {
        authAttempts: authAttempts.rowCount ?? 0,
        passwordTokens: passwordTokens.rowCount ?? 0,
        sessions: sessions.rowCount ?? 0,
        oauthFlows: oauthFlows.rowCount ?? 0,
      };
    } finally {
      client.release();
    }
  }
}
