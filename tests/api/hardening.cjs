const assert = require("node:assert/strict");
const api = process.env.API_URL || "http://127.0.0.1:3001";
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
  const resetIp1 = `10.0.2.${Math.floor(Math.random() * 200) + 1}`;
  const resetIp2 = `10.0.2.${Math.floor(Math.random() * 200) + 1}`;
  const token = "a".repeat(43);
  for (let i = 0; i < 20; i++)
    await post("/api/auth/reset", resetIp1, { token, password: "Contrasena-larga-1" });
  assert.equal((await post("/api/auth/reset", resetIp1, { token, password: "Contrasena-larga-1" })).status, 429);
  assert.equal((await post("/api/auth/reset", resetIp2, { token, password: "Contrasena-larga-1" })).status, 422);

  // Rate limit de login por tupla (IP, cuenta): un atacante en IP1 no bloquea a la víctima en IP2
  const targetEmail = `target-lock-${Date.now()}@example.test`;
  const attackerIp = `10.0.3.${Math.floor(Math.random() * 200) + 1}`;
  const victimIp = `10.0.3.${Math.floor(Math.random() * 200) + 1}`;
  for (let i = 0; i < 20; i++) {
    const res = await post("/api/auth/login", attackerIp, { email: targetEmail, password: "WrongPassword-1" });
    assert.equal(res.status, 401);
  }
  // El intento 21 del atacante debe ser bloqueado por rate limit (429)
  const lockedRes = await post("/api/auth/login", attackerIp, { email: targetEmail, password: "WrongPassword-1" });
  assert.equal(lockedRes.status, 429);
  const lockedProblem = await lockedRes.json();
  assert.equal(lockedProblem.code, "rate_limited");
  assert.ok(lockedRes.headers.get("retry-after"), "Debe incluir cabecera Retry-After en 429");

  // La víctima desde otra IP no queda bloqueada para la misma cuenta objetivo
  const victimRes = await post("/api/auth/login", victimIp, { email: targetEmail, password: "WrongPassword-1" });
  assert.equal(victimRes.status, 401, "La víctima en otra IP no debe recibir 429");

  // Registro con correo duplicado responde 409 Conflict (RFC 9457)
  const dupEmail = `dup-${Date.now()}@example.test`;
  const reg1 = await post("/api/auth/register", "10.0.4.1", {
    name: "Original User",
    email: dupEmail,
    password: "Password-1234!",
    termsAccepted: true,
  });
  assert.equal(reg1.status, 201);
  const reg2 = await post("/api/auth/register", "10.0.4.2", {
    name: "Imposter User",
    email: dupEmail,
    password: "Password-5678!",
    termsAccepted: true,
  });
  assert.equal(reg2.status, 409);
  const reg2Problem = await reg2.json();
  assert.equal(reg2Problem.code, "account_already_exists");
  assert.equal(reg2Problem.errors[0]?.field, "email");
  assert.equal(reg2Problem.errors[0]?.code, "already_exists");

  // Varios logins a la vez no tumban la API (Argon2 acotado)
  const results = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      post("/api/auth/login", `10.0.1.${i}`, { email: `nadie${i}@example.test`, password: "Contrasena-larga-1" })),
  );
  assert.ok(results.every((r) => r.status === 401));
  assert.equal((await fetch(api + "/api/health")).status, 200);
  console.log("PASS: errors[], X-Request-ID, tupla (IP, cuenta) anti-DoS, 409 registro duplicado y logins concurrentes");
})().catch((error) => { console.error(error); process.exitCode = 1; });
