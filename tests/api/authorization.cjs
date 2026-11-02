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

  console.log("PASS: Matriz de autorización verificada (401 anónimo y 403 regular en admin)");
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
