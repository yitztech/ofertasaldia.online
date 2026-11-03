import { Pool } from "pg";
import { z } from "zod";
import { uuidv7 } from "./uuid.js";
async function main() {
  const email = z.email().max(254).parse(process.argv[2]);
  const pool = new Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL }
      : {
          host: process.env.POSTGRES_HOST,
          database: process.env.POSTGRES_DB,
          user: process.env.POSTGRES_APP_USER,
          password: process.env.APP_DATABASE_PASSWORD,
        },
  );
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const r = await c.query(
      `UPDATE users SET role='admin',updated_at=now() WHERE lower(email)=lower($1) AND suspended_at IS NULL RETURNING id`,
      [email],
    );
    if (r.rows.length !== 1)
      throw new Error("Registra primero una cuenta activa.");
    await c.query(
      "INSERT INTO admin_audit(id,actor_id,action,target_id) VALUES ($1,$2,$3,$2)",
      [uuidv7(), r.rows[0].id, "admin_bootstrapped"],
    );
    await c.query("COMMIT");
    console.log("Administrador configurado.");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}
void main();
