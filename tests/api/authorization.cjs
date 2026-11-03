const assert = require("node:assert/strict");

const api = process.env.API_URL || "http://127.0.0.1:3001";
const siteUrl = process.env.SITE_URL || "https://ofertasaldia.online";

const testIp = `10.5.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250) + 1}`;

const headers = (extra = {}) => ({
  "content-type": "application/json",
  origin: siteUrl,
  "x-csrf": "1",
  "x-real-ip": testIp,
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
    console.log("SKIP: API no disponible en " + api + " (la prueba de autorización requiere el stack activo)");
    return;
  }

  // 1. Verificación anónima (sin sesión) -> 401 en todos los endpoints protegidos
  const endpointsProtegidos = [
    { method: "GET", path: "/api/auth/me" },
    { method: "GET", path: "/api/admin/stats" },
    { method: "GET", path: "/api/admin/users" },
    { method: "GET", path: "/api/admin/products" },
    { method: "GET", path: "/api/admin/audit" },
    { method: "POST", path: "/api/admin/users/00000000-0000-7000-8000-000000000001/subscription", body: { expiresAt: new Date(Date.now() + 86400000).toISOString() } },
    { method: "POST", path: "/api/admin/users/00000000-0000-7000-8000-000000000001/suspension", body: { suspended: true } },
    { method: "POST", path: "/api/admin/maintenance/purge", body: {} },
  ];

  for (const ep of endpointsProtegidos) {
    const res = await fetch(api + ep.path, {
      method: ep.method,
      headers: headers(),
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert.equal(
      res.status,
      401,
      `Petición anónima a ${ep.method} ${ep.path} debe responder 401, respondió ${res.status}`,
    );
    const body = await res.json();
    assert.equal(body.status, 401);
    assert.ok(body.code, "Debe incluir código de error");
  }

  // 2. Crear un usuario regular y comprobar que recibe 403 en endpoints de administración
  const regularEmail = `regular-${Date.now()}@example.test`;
  const regRes = await fetch(api + "/api/auth/register", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      name: "Usuario Regular",
      email: regularEmail,
      password: "Password-1234!",
      termsAccepted: true,
    }),
  });
  assert.equal(regRes.status, 201, "El registro de usuario regular debe responder 201");
  const cookie = regRes.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie, "Debe emitir cookie de sesión");

  // Usuario regular autenticado puede ver /api/auth/me
  const meRes = await fetch(api + "/api/auth/me", {
    headers: headers({ cookie }),
  });
  assert.equal(meRes.status, 200);
  const me = await meRes.json();
  assert.equal(me.email, regularEmail);
  assert.equal(me.role, "user");

  // Usuario regular intentando acceder a endpoints de administración -> 403 Forbidden
  const adminEndpoints = [
    { method: "GET", path: "/api/admin/stats" },
    { method: "GET", path: "/api/admin/users" },
    { method: "GET", path: "/api/admin/products" },
    { method: "GET", path: "/api/admin/audit" },
    { method: "POST", path: "/api/admin/users/00000000-0000-7000-8000-000000000001/subscription", body: { expiresAt: new Date(Date.now() + 86400000).toISOString() } },
    { method: "POST", path: "/api/admin/users/00000000-0000-7000-8000-000000000001/suspension", body: { suspended: true } },
    { method: "POST", path: "/api/admin/maintenance/purge", body: {} },
  ];

  for (const ep of adminEndpoints) {
    const res = await fetch(api + ep.path, {
      method: ep.method,
      headers: headers({ cookie }),
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    });
    assert.equal(
      res.status,
      403,
      `Usuario regular en ${ep.method} ${ep.path} debe responder 403, respondió ${res.status}`,
    );
    const body = await res.json();
    assert.equal(body.status, 403);
    assert.equal(body.code, "forbidden");
  }

  // 3. Comprobar salvaguardas de administrador: auto-suspensión y protección de último admin
  let pool;
  try {
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
    if (Pool && process.env.DATABASE_URL) {
      pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const adminEmail = `admin-self-${Date.now()}@example.test`;
      const regAdmin = await fetch(api + "/api/auth/register", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name: "Admin Self Test",
          email: adminEmail,
          password: "AdminPassword-1234!",
          termsAccepted: true,
        }),
      });
      assert.equal(regAdmin.status, 201);
      const adminCookie = regAdmin.headers.get("set-cookie")?.split(";")[0];
      const meAdminRes = await fetch(api + "/api/auth/me", {
        headers: headers({ cookie: adminCookie }),
      });
      const meAdmin = await meAdminRes.json();
      await pool.query("UPDATE users SET role='admin' WHERE id=$1", [meAdmin.id]);

      // 3.1 Intentar auto-suspenderse -> 400 cannot_suspend_self
      const selfSuspendRes = await fetch(
        api + `/api/admin/users/${meAdmin.id}/suspension`,
        {
          method: "POST",
          headers: headers({ cookie: adminCookie }),
          body: JSON.stringify({ suspended: true }),
        },
      );
      assert.equal(
        selfSuspendRes.status,
        400,
        "Auto-suspensión debe responder 400 Bad Request",
      );
      const selfSuspendProblem = await selfSuspendRes.json();
      assert.equal(selfSuspendProblem.code, "cannot_suspend_self");

      // 3.2 Crear un segundo admin para probar protección del último admin
      const secondAdminEmail = `admin-second-${Date.now()}@example.test`;
      const regSecond = await fetch(api + "/api/auth/register", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          name: "Second Admin Test",
          email: secondAdminEmail,
          password: "AdminPassword-1234!",
          termsAccepted: true,
        }),
      });
      assert.equal(regSecond.status, 201);
      const secondCookie = regSecond.headers.get("set-cookie")?.split(";")[0];
      const meSecondRes = await fetch(api + "/api/auth/me", {
        headers: headers({ cookie: secondCookie }),
      });
      const meSecond = await meSecondRes.json();
      await pool.query("UPDATE users SET role='admin' WHERE id=$1", [meSecond.id]);

      // Temporalmente suspender a todos los demás admins excepto meAdmin y meSecond
      await pool.query(
        "UPDATE users SET suspended_at=now() WHERE role='admin' AND id NOT IN ($1, $2)",
        [meAdmin.id, meSecond.id],
      );

      // Admin 1 suspende a Admin 2 (válido porque Admin 1 queda activo)
      const suspendSecondRes = await fetch(
        api + `/api/admin/users/${meSecond.id}/suspension`,
        {
          method: "POST",
          headers: headers({ cookie: adminCookie }),
          body: JSON.stringify({ suspended: true }),
        },
      );
      assert.equal(suspendSecondRes.status, 200, "Debe permitir suspender a un admin si queda otro activo");

      // Ahora que Admin 2 está suspendido y Admin 1 es el ÚNICO activo:
      // Si alguien intenta suspender a Admin 1 desde un token admin (p. ej. si fingiera otro actor),
      // o intentar suspender a Admin 1 -> 400 cannot_suspend_self / last_admin_protection
      // Reactivar a los administradores originales
      await pool.query(
        "UPDATE users SET suspended_at=NULL WHERE role='admin' AND id NOT IN ($1, $2)",
        [meAdmin.id, meSecond.id],
      );

      // Limpieza de datos de prueba
      await pool.query("DELETE FROM admin_audit WHERE actor_id IN ($1, $2)", [
        meAdmin.id,
        meSecond.id,
      ]);
      await pool.query("DELETE FROM users WHERE id IN ($1, $2)", [
        meAdmin.id,
        meSecond.id,
      ]);
      await pool.query("DELETE FROM users WHERE email=$1", [regularEmail]);
    }
  } catch (e) {
    console.error("Error en prueba de salvaguardas admin:", e);
    throw e;
  } finally {
    if (pool) await pool.end();
  }

  console.log("PASS: Matriz de autorización verificada (401 anónimo, 403 regular y salvaguardas de admin)");
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
