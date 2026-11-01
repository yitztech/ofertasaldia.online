const assert = require("node:assert/strict");
const api = "http://127.0.0.1:3001";
const headers = (ip, extra = {}) => ({
  "content-type": "application/json",
  origin: process.env.SITE_URL,
  "x-csrf": "1",
  "x-real-ip": ip,
  ...extra,
});
const post = (path, ip, body, extra) =>
  fetch(api + path, { method: "POST", headers: headers(ip, extra), body: JSON.stringify(body) });
(async () => {
  // 422 con errors[] por campo y X-Request-ID devuelto (§22, §30)
  const bad = await post("/api/auth/register", "10.0.0.1", {
    name: "Ana123", email: "no-es-correo", password: "corta", termsAccepted: true,
  }, { "x-request-id": "prueba-hardening-1" });
  assert.equal(bad.status, 422);
  assert.equal(bad.headers.get("x-request-id"), "prueba-hardening-1");
  const problem = await bad.json();
  assert.equal(problem.code, "validation_failed");
  const fields = Object.fromEntries(problem.errors.map((e) => [e.field, e.code]));
  assert.equal(fields.name, "invalid_characters");
  assert.equal(fields.email, "invalid_format");
  assert.equal(fields.password, "too_short");
  const unknown = await post("/api/auth/login", "10.0.0.1", { email: "a@b.co", password: "x", admin: true });
  assert.equal((await unknown.json()).errors[0].code, "unknown_field");
  const generated = await fetch(api + "/api/auth/me");
  assert.match(generated.headers.get("x-request-id") ?? "", /^[a-zA-Z0-9-]{1,64}$/);

  // Los intentos de restablecer cuentan por IP: otra IP no queda bloqueada
  const token = "a".repeat(43);
  for (let i = 0; i < 21; i++)
    await post("/api/auth/reset", "10.0.0.2", { token, password: "Contrasena-larga-1" });
  assert.equal((await post("/api/auth/reset", "10.0.0.2", { token, password: "Contrasena-larga-1" })).status, 429);
  assert.equal((await post("/api/auth/reset", "10.0.0.3", { token, password: "Contrasena-larga-1" })).status, 422);

  // Varios logins a la vez no tumban la API (Argon2 acotado)
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      post("/api/auth/login", `10.0.1.${i}`, { email: `nadie${i}@example.test`, password: "Contrasena-larga-1" })),
  );
  assert.ok(results.every((r) => r.status === 401));
  assert.equal((await fetch(api + "/api/health")).status, 200);
  console.log("PASS: errors[], X-Request-ID, límite por IP y logins concurrentes");
})().catch((error) => { console.error(error); process.exitCode = 1; });
