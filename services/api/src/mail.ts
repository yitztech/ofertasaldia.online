import {
  Injectable,
  OnModuleInit,
  OnApplicationShutdown,
} from "@nestjs/common";
import type { PgBoss } from "pg-boss" with { "resolution-mode": "import" };
import { createTransport } from "nodemailer";

@Injectable()
export class MailService implements OnModuleInit, OnApplicationShutdown {
  queue!: PgBoss;
  async onModuleInit() {
    for (const name of ["SMTP_HOST", "MAIL_FROM"])
      if (!process.env[name]) throw new Error(`${name} es obligatoria`);
    const { PgBoss } = await import("pg-boss");
    this.queue = new PgBoss({ connectionString: process.env.DATABASE_URL });
    this.queue.on("error", (err) => {
      console.error(
        JSON.stringify({
          time: new Date().toISOString(),
          level: "error",
          msg: "pgboss_error",
          error: (err as any)?.message || String(err),
        }),
      );
    });
    await this.queue.start();
    await this.queue.createQueue("mail", {
      retryLimit: 5,
      retryDelay: 30,
      retryBackoff: true,
    });
    const transport = createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
      connectionTimeout: 5000,
      socketTimeout: 30000,
    });
    await this.queue.work<{ to: string; subject: string; text: string }>(
      "mail",
      async (jobs) => {
        for (const job of jobs)
          await transport.sendMail({
            from: process.env.MAIL_FROM,
            ...job.data,
            messageId: `<${job.id}@ofertasaldia.online>`,
          });
      },
    );
  }
  async send(to: string, subject: string, text: string) {
    await this.queue.send("mail", { to, subject, text });
  }
  async onApplicationShutdown() {
    await this.queue.stop();
  }
}
