const assert = require("node:assert/strict");
(async () => {
  const root = "http://127.0.0.1:3001/api/auth/oauth/";
  for (const provider of ["google", "apple"]) {
    const result = await fetch(root + provider, { redirect: "manual" });
    assert.equal(
      result.status,
      503,
      "proveedor sin credenciales no debe iniciar sesión",
    );
    const body = await result.json();
    assert.equal(body.code, "oauth_unavailable");
    assert.ok(!JSON.stringify(body).includes("CLIENT_SECRET"));
  }
  assert.equal((await fetch(root + "unknown")).status, 404);
  assert.equal(
    (await fetch(root + "google/callback?state=invalid&code=invalid")).status,
    503,
  );
  console.log(
    "PASS: OAuth sin credenciales, proveedor desconocido y callback no configurado rechazados",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
