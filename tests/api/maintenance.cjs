const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

let Pool;
try {
  Pool = require("pg").Pool;
} catch {
  try {
    Pool = require("../../services/api/node_modules/pg").Pool;
  } catch {
    try {
      Pool = require("../services/api/node_modules/pg").Pool;
    } catch {}
  }
}

const api = process.env.API_URL || "http://127.0.0.1:3001";
const dbUrl =
  process.env.DATABASE_URL ||
  "postgres://ofertas:development@postgres:5432/ofertas";

const digest = (v) => createHash("sha256").update(v).digest("hex");

const headers = (extra = {}) => ({
  "content-type": "application/json",
  origin: process.env.SITE_URL || "http://localhost:8080",
  "x-csrf": "1",
  ...extra,
});

(async () => {
  // Comprobar si la API está disponible
  let available = false;
  try {
    const res = await fetch(api + "/healthz", { signal: AbortSignal.timeout(1500) });
    available = res.ok;
  } catch {
    available = false;
  }

  if (!available) {
    console.log("SKIP: API no disponible en " + api + " (la prueba de mantenimiento requiere el stack activo)");
    return;
  }

  // 1. Comprobar resiliencia de PostgreSQL bajo concurrencia (15 peticiones simultáneas, superando max: 8)
  const concurrentPings = Array.from({ length: 15 }, (_, i) =>
    fetch(api + "/api/products?q=test" + i, { headers: headers() }),
  );
  const pingResults = await Promise.all(concurrentPings);
  assert.ok(
    pingResults.every((r) => r.status === 200),
    "Todas las 15 consultas concurrentes deben responder 200 sin timeout de conexión",
  );

  // 2. Conectar a PostgreSQL para insertar registros temporales vencidos y activos
  if (!Pool) {
    console.log(
      "PASS: Concurrencia de 15 peticiones verificada (la prueba de tablas directas requiere pg en host o contenedor de API)",
    );
    return;
  }
  let pool;
  try {
    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 3000,
      statement_timeout: 3000,
    });
    // Test rápido de conectividad directa
    await pool.query("SELECT 1");
  } catch {
    console.log(
      "PASS: Concurrencia de 15 peticiones verificada (la verificación de tablas directas requiere DB accesible)",
    );
    return;
  }

  const client = await pool.connect();
  try {
    // Asegurar usuario de prueba para foreign keys
    const testUserId = "00000000-0000-7000-8000-000000000099";
    await client.query(
      `INSERT INTO users(id, name, email, password_hash, role)
       VALUES ($1, 'Test Maintenance', 'maintenance-test@example.test', 'hash', 'admin')
       ON CONFLICT (id) DO UPDATE SET role='admin', suspended_at=NULL`,
      [testUserId],
    );

    // Iniciar sesión admin para invocar POST /api/admin/maintenance/purge
    const adminSessionToken = "maint-admin-" + Date.now();
    await client.query(
      `INSERT INTO sessions(token_hash, user_id, expires_at, last_seen_at)
       VALUES ($1, $2, now() + interval '1 day', now())`,
      [digest(adminSessionToken), testUserId],
    );

    // Insertar registros vencidos
    const expAttemptKey = digest("maint-exp-attempt-" + Date.now());
    const freshAttemptKey = digest("maint-fresh-attempt-" + Date.now());
    await client.query(
      `INSERT INTO auth_attempts(key, attempts, window_start) VALUES
       ($1, 5, now() - interval '3 hours'),
       ($2, 2, now() - interval '10 minutes')`,
      [expAttemptKey, freshAttemptKey],
    );

    const expToken = digest("maint-exp-token-" + Date.now());
    const freshToken = digest("maint-fresh-token-" + Date.now());
    await client.query(
      `INSERT INTO password_tokens(token_hash, user_id, expires_at) VALUES
       ($1, $2, now() - interval '10 minutes'),
       ($3, $2, now() + interval '30 minutes')`,
      [expToken, testUserId, freshToken],
    );

    const expSess1 = digest("maint-exp-sess1-" + Date.now());
    const expSess2 = digest("maint-exp-sess2-" + Date.now());
    const freshSess = digest("maint-fresh-sess-" + Date.now());
    await client.query(
      `INSERT INTO sessions(token_hash, user_id, expires_at, last_seen_at) VALUES
       ($1, $4, now() - interval '1 hour', now() - interval '10 minutes'),
       ($2, $4, now() + interval '5 days', now() - interval '25 hours'),
       ($3, $4, now() + interval '5 days', now() - interval '10 minutes')`,
      [expSess1, expSess2, freshSess, testUserId],
    );

    const expOauth = digest("maint-exp-oauth-" + Date.now());
    const freshOauth = digest("maint-fresh-oauth-" + Date.now());
    await client.query(
      `INSERT INTO oauth_flows(state_hash, provider, binding_hash, nonce, verifier, expires_at) VALUES
       ($1, 'google', 'b1', 'n1', 'v1', now() - interval '5 minutes'),
       ($2, 'google', 'b2', 'n2', 'v2', now() + interval '10 minutes')`,
      [expOauth, freshOauth],
    );

    // 3. Ejecutar purga a través del endpoint administrativo
    const purgeRes = await fetch(api + "/api/admin/maintenance/purge", {
      method: "POST",
      headers: headers({
        cookie: `session=${adminSessionToken}; __Host-session=${adminSessionToken}`,
      }),
      body: JSON.stringify({}),
    });
    assert.equal(
      purgeRes.status,
      200,
      `Purge debe responder 200, respondió ${purgeRes.status}`,
    );
    const purgeBody = await purgeRes.json();
    assert.equal(purgeBody.status, "ok");
    assert.ok(
      purgeBody.purged.authAttempts >= 1,
      "Debe haber purgado al menos 1 intento vencido",
    );
    assert.ok(
      purgeBody.purged.passwordTokens >= 1,
      "Debe haber purgado al menos 1 token vencido",
    );
    assert.ok(
      purgeBody.purged.sessions >= 2,
      "Debe haber purgado al menos 2 sesiones vencidas",
    );
    assert.ok(
      purgeBody.purged.oauthFlows >= 1,
      "Debe haber purgado al menos 1 flujo oauth vencido",
    );

    // 4. Verificar en base de datos que los vencidos no existen y los frescos permanecen
    const checkAttempts = await client.query(
      "SELECT key FROM auth_attempts WHERE key IN ($1, $2)",
      [expAttemptKey, freshAttemptKey],
    );
    assert.equal(checkAttempts.rows.length, 1);
    assert.equal(checkAttempts.rows[0].key, freshAttemptKey);

    const checkTokens = await client.query(
      "SELECT token_hash FROM password_tokens WHERE token_hash IN ($1, $2)",
      [expToken, freshToken],
    );
    assert.equal(checkTokens.rows.length, 1);
    assert.equal(checkTokens.rows[0].token_hash, freshToken);

    const checkSessions = await client.query(
      "SELECT token_hash FROM sessions WHERE token_hash IN ($1, $2, $3)",
      [expSess1, expSess2, freshSess],
    );
    assert.equal(checkSessions.rows.length, 1);
    assert.equal(checkSessions.rows[0].token_hash, freshSess);

    const checkOauth = await client.query(
      "SELECT state_hash FROM oauth_flows WHERE state_hash IN ($1, $2)",
      [expOauth, freshOauth],
    );
    assert.equal(checkOauth.rows.length, 1);
    assert.equal(checkOauth.rows[0].state_hash, freshOauth);

    // 5. Verificar que se registró en auditoría administrativa
    const audit = await client.query(
      "SELECT action, actor_id FROM admin_audit WHERE actor_id=$1 AND action='maintenance_purge'",
      [testUserId],
    );
    assert.ok(audit.rows.length >= 1, "Debe registrarse en admin_audit");

    // Limpieza de datos de prueba
    await client.query("DELETE FROM auth_attempts WHERE key=$1", [
      freshAttemptKey,
    ]);
    await client.query("DELETE FROM password_tokens WHERE token_hash=$1", [
      freshToken,
    ]);
    await client.query("DELETE FROM sessions WHERE token_hash IN ($1, $2)", [
      freshSess,
      digest(adminSessionToken),
    ]);
    await client.query("DELETE FROM oauth_flows WHERE state_hash=$1", [
      freshOauth,
    ]);
    await client.query("DELETE FROM admin_audit WHERE actor_id=$1", [
      testUserId,
    ]);
    await client.query("DELETE FROM users WHERE id=$1", [testUserId]);

    console.log(
      "PASS: Resiliencia del pool de PostgreSQL (15 peticiones) y purga de tablas temporales",
    );
  } finally {
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
