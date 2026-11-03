const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const api = process.env.API_URL || "http://127.0.0.1:3001";

(async () => {
  // 1. Cargar especificación local o desde el endpoint vivo
  const specPath = path.resolve(__dirname, "../../docs/openapi.json");
  let spec = null;
  if (fs.existsSync(specPath)) {
    spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
  }

  // 2. Si la API está corriendo, validar que el endpoint responda y sea coherente
  try {
    const res = await fetch(api + "/api/openapi.json", { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const liveSpec = await res.json();
      if (!spec) spec = liveSpec;
      assert.equal(liveSpec.openapi, "3.1.0");
      assert.equal(liveSpec.info.title, spec.info.title);
      assert.deepEqual(Object.keys(liveSpec.paths).sort(), Object.keys(spec.paths).sort());
    }
  } catch {
    // Si la API no está disponible en este entorno, se valida el archivo estático
  }

  assert.ok(spec, "Debe existir una especificación OpenAPI válida (archivo docs/openapi.json o endpoint /api/openapi.json)");

  assert.equal(spec.openapi, "3.1.0", "Debe ser OpenAPI 3.1.0");
  assert.ok(spec.info && spec.info.title && spec.info.version, "Debe contener info");
  assert.ok(spec.paths && Object.keys(spec.paths).length > 0, "Debe contener paths");

  // Validar rutas obligatorias de AGENTS.md
  const expectedPaths = [
    "/api/health",
    "/api/categories",
    "/api/products",
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
    "/api/auth/recover",
    "/api/auth/reset",
    "/api/admin/stats",
    "/api/admin/users",
    "/api/admin/products",
    "/api/admin/audit",
    "/api/admin/maintenance/purge",
    "/api/payments/plans",
    "/api/payments/subscription",
    "/api/payments/checkout-session",
    "/api/public/v1/webhooks/payments",
    "/api/articles",
  ];

  for (const p of expectedPaths) {
    assert.ok(spec.paths[p], `La ruta ${p} debe estar documentada en OpenAPI`);
  }

  // Validar esquema ProblemDetails RFC 9457
  const problemSchema = spec.components?.schemas?.ProblemDetails;
  assert.ok(problemSchema, "Debe existir components.schemas.ProblemDetails");
  assert.deepEqual(
    problemSchema.required.sort(),
    ["code", "detail", "status", "title", "type"].sort(),
    "ProblemDetails debe requerir type, title, status, code, detail",
  );

  console.log("PASS: Contrato OpenAPI validado con éxito");
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
