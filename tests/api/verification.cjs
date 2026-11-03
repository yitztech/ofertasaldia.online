const assert = require("node:assert/strict");
const base = "http://127.0.0.1:3001/api/auth/";
const email = `verify-${Date.now()}@example.com`;

async function post(path, body, cookie) {
  return fetch(base + path, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: process.env.SITE_URL || "http://localhost:8080",
      "x-csrf": "1",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

(async () => {
  // Comprobar si la API está disponible
  let available = false;
  try {
    const res = await fetch("http://127.0.0.1:3001/healthz", { signal: AbortSignal.timeout(1500) });
    available = res.ok;
  } catch {
    available = false;
  }
  if (!available) {
    console.log("SKIP: API no disponible en http://127.0.0.1:3001 (la prueba de verificación de correo requiere el stack activo)");
    return;
  }

  // 1. Registro envía correo de verificación
  const reg = await post("register", {
    name: "Carlos Verification",
    email,
    password: "Password-1234!",
    termsAccepted: true,
  });
  assert.equal(reg.status, 201, "Registro exitoso");
  const cookie = reg.headers.get("set-cookie").split(";")[0];

  // 2. Estado inicial: me devuelve verifiedAt = null
  const meInitialRes = await fetch(base + "me", { headers: { cookie } });
  assert.equal(meInitialRes.status, 200);
  const meInitial = await meInitialRes.json();
  assert.equal(meInitial.verifiedAt, null, "La cuenta recién creada debe tener verifiedAt = null");

  // 3. Obtener correo de verificación desde Mailpit
  let message;
  for (let i = 0; i < 30; i++) {
    const list = await (
      await fetch("http://mailpit:8025/api/v1/messages")
    ).json();
    message = list.messages?.find(
      (m) =>
        m.To?.some((to) => to.Address === email) &&
        m.Subject?.includes("Verifica tu correo"),
    );
    if (message) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(message, "Correo de verificación entregado a Mailpit");

  const detail = await (
    await fetch("http://mailpit:8025/api/v1/message/" + message.ID)
  ).json();
  const tokenMatch = detail.Text.match(/token=([A-Za-z0-9_-]+)/);
  assert.ok(tokenMatch, "El cuerpo del correo debe contener el token de verificación");
  const token = tokenMatch[1];
  assert.equal(token.length, 43, "El token debe tener 43 caracteres (base64url de 32 bytes)");

  // 4. Intento con token inválido debe fallar con 422
  const badTokenRes = await post("verify-email", { token: "invalid-token-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" });
  assert.equal(badTokenRes.status, 422);
  const badTokenProblem = await badTokenRes.json();
  assert.equal(badTokenProblem.code, "invalid_token");

  // 5. Verificación con token válido
  const verifyRes = await post("verify-email", { token });
  assert.equal(verifyRes.status, 200, "Verificación exitosa debe responder 200");
  const verifyData = await verifyRes.json();
  assert.equal(verifyData.status, "ok");

  // 6. Verificar que `me` ahora refleja verifiedAt no nulo
  const meVerifiedRes = await fetch(base + "me", { headers: { cookie } });
  const meVerified = await meVerifiedRes.json();
  assert.ok(meVerified.verifiedAt, "La cuenta ahora debe tener verifiedAt con timestamp");

  // 7. Token de un solo uso: reutilizarlo debe fallar con 422
  const reusedRes = await post("verify-email", { token });
  assert.equal(reusedRes.status, 422, "Reutilizar token debe fallar con 422");

  // 8. Reenviar verificación a usuario ya verificado no genera nuevo token pero responde 200
  const resendVerified = await post("resend-verification", { email });
  assert.equal(resendVerified.status, 200);

  // 9. Reenviar verificación a usuario no verificado envía un nuevo correo
  const email2 = `resend-${Date.now()}@example.com`;
  const reg2 = await post("register", {
    name: "Lucía Resend",
    email: email2,
    password: "Password-1234!",
    termsAccepted: true,
  });
  assert.equal(reg2.status, 201);

  // Borrar mensajes de Mailpit previos para email2 si los hubiera
  const resendRes = await post("resend-verification", { email: email2 });
  assert.equal(resendRes.status, 200);

  let message2;
  for (let i = 0; i < 30; i++) {
    const list = await (
      await fetch("http://mailpit:8025/api/v1/messages")
    ).json();
    const matching = list.messages?.filter(
      (m) =>
        m.To?.some((to) => to.Address === email2) &&
        m.Subject?.includes("Verifica tu correo"),
    );
    if (matching && matching.length >= 2) {
      message2 = matching[0];
      break;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(message2, "Se debe recibir el segundo correo de verificación tras reenviar");

  console.log("PASS: Flujo completo de verificación de correo electrónico (registro, Mailpit, un solo uso y reenvío)");
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
