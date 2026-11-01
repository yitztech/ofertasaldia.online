const assert = require("node:assert/strict");
void import("./dist/main.js");
(async () => {
  const root = "http://127.0.0.1:3001/api/auth/oauth/";
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch("http://127.0.0.1:3001/healthz")).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  const start = await fetch(root + "google", { redirect: "manual" });
  assert.equal(start.status, 302);
  const url = new URL(start.headers.get("location"));
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("nonce"));
  assert.ok(url.searchParams.get("state"));
  const cookie = start.headers.get("set-cookie").split(";")[0];
  const state = url.searchParams.get("state");
  assert.equal(
    (await fetch(root + "google/callback?state=" + state + "&code=bogus"))
      .status,
    400,
  );
  assert.equal(
    (
      await fetch(root + "google/callback?state=wrong&code=bogus", {
        headers: { cookie },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(root + "google/callback?state=" + state + "&code=bogus", {
        headers: { cookie },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(root + "google/callback?state=" + state + "&code=bogus", {
        headers: { cookie },
      })
    ).status,
    400,
  );
  console.log(
    "PASS: Google inicia con PKCE/nonce/state y rechaza callback sin cookie o estado correcto",
  );
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
