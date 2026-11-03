#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const suites = [
  {
    name: "unit",
    description: "Verificaciones sin Docker (check-test-only, contratos OpenAPI, esquemas)",
    command: "node",
    args: ["scripts/check-test-only.mjs"],
  },
  {
    name: "openapi",
    description: "Validación de contrato OpenAPI 3.1",
    command: "node",
    args: ["tests/api/openapi-contract.cjs"],
  },
  {
    name: "typecheck",
    description: "Comprobación estática de tipos (API, web, admin)",
    command: "pnpm",
    args: ["run", "typecheck"],
  },
  {
    name: "api",
    description: "Pruebas de API contra stack activo (hardening, oauth, authorization, proxy, maintenance, verification, payments, articles, catalog, profiles, redirect)",
    command: "node",
    args: ["-e", "require('./tests/api/authorization.cjs'); require('./tests/api/maintenance.cjs'); require('./tests/api/verification.cjs'); require('./tests/api/payments.cjs'); require('./tests/api/articles.cjs'); require('./tests/api/catalog.cjs'); require('./tests/api/profiles.cjs'); require('./tests/api/redirect.cjs');"],
  },
];

const requested = process.argv.slice(2);

if (requested.includes("--lista") || requested.includes("-l")) {
  console.log("Suites disponibles:");
  for (const s of suites) {
    console.log(`  - ${s.name}: ${s.description}`);
  }
  process.exit(0);
}

const toRun = requested.length
  ? suites.filter((s) => requested.includes(s.name))
  : suites;

if (requested.length && !toRun.length) {
  console.error(`Ninguna suite coincide con: ${requested.join(", ")}`);
  process.exit(1);
}

console.log("==========================================");
console.log("  Ejecutando pruebas de la plataforma");
console.log("==========================================");

const results = [];
let anyFailed = false;

for (const suite of toRun) {
  process.stdout.write(`\n▶ [${suite.name}] ${suite.description}...\n`);
  const start = Date.now();
  const res = spawnSync(suite.command, suite.args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  const duration = ((Date.now() - start) / 1000).toFixed(2);
  const success = res.status === 0;
  if (!success) anyFailed = true;

  results.push({
    name: suite.name,
    success,
    duration,
  });
}

console.log("\n==========================================");
console.log("  Resumen de pruebas");
console.log("==========================================");
for (const r of results) {
  const icon = r.success ? "✓ PASS" : "✗ FAIL";
  console.log(`${icon.padEnd(8)} ${r.name.padEnd(15)} (${r.duration}s)`);
}
console.log("==========================================");

if (anyFailed) {
  process.exit(1);
}
console.log("Todas las pruebas pasaron correctamente.\n");
