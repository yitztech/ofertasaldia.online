const assert = require("node:assert/strict");
const base = "http://127.0.0.1:3001/api/auth/";
const email = `qa-${Date.now()}@example.com`;
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
  const reg = await post("register", {
    name: "María Pérez",
    email,
    password: "Initial123!",
    termsAccepted: true,
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.headers.get("set-cookie"), "registro crea sesión y cookie");
  const dup = await post("register", {
    name: "María Pérez Duplicada",
    email,
    password: "AnotherPassword123!",
    termsAccepted: true,
  });
  assert.equal(dup.status, 409, "registro duplicado debe responder 409 Conflict");
  const dupProblem = await dup.json();
  assert.equal(dupProblem.code, "account_already_exists");
  assert.equal(dupProblem.errors?.[0]?.field, "email");
  assert.equal(dupProblem.errors?.[0]?.code, "already_exists");
  const login = await post("login", { email, password: "Initial123!" });
  assert.equal(login.status, 201);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.equal((await post("recover", { email })).status, 201);
  let message;
  for (let i = 0; i < 30; i++) {
    const list = await (
      await fetch("http://mailpit:8025/api/v1/messages")
    ).json();
    message = list.messages?.find((m) =>
      m.To?.some((to) => to.Address === email) &&
      m.Subject?.includes("Restablecer"),
    );
    if (message) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.ok(message, "correo entregado a Mailpit");
  const detail = await (
    await fetch("http://mailpit:8025/api/v1/message/" + message.ID)
  ).json();
  const token = detail.Text.match(/token=([A-Za-z0-9_-]+)/)[1];
  assert.equal(
    (await post("reset", { token, password: "Changed123!" })).status,
    201,
  );
  assert.equal(
    (await post("reset", { token, password: "Changed123!" })).status,
    422,
  );
  assert.equal((await fetch(base + "me", { headers: { cookie } })).status, 401);
  assert.equal(
    (await post("login", { email, password: "Initial123!" })).status,
    401,
  );
  assert.equal(
    (await post("login", { email, password: "Changed123!" })).status,
    201,
  );
  console.log(
    "PASS: registro, acceso, Mailpit, cambio, token de un uso y revocación de sesión",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
