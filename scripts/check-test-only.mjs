#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const testOnlyServices = ["mailpit"];
const prodComposePath = path.join(root, "compose.prod.yml");
const ciComposePath = path.join(root, "compose.ci.yml");
const deployWorkflowPath = path.join(root, ".github/workflows/deploy.yml");

let failed = false;

// 1. Verificar compose.ci.yml: los servicios de pruebas deben llevar la etiqueta .solo-pruebas: "true"
if (fs.existsSync(ciComposePath)) {
  const ciContent = fs.readFileSync(ciComposePath, "utf8");
  for (const svc of testOnlyServices) {
    if (ciContent.includes(`${svc}:`)) {
      if (!ciContent.includes(`.solo-pruebas: "true"`) && !ciContent.includes(`solo-pruebas: "true"`)) {
        console.error(`ERROR: En compose.ci.yml el servicio solo de pruebas '${svc}' no tiene etiqueta .solo-pruebas: "true"`);
        failed = true;
      }
    }
  }
}

// 2. Verificar compose.prod.yml: ningún servicio de pruebas puede aparecer en producción
if (fs.existsSync(prodComposePath)) {
  const prodContent = fs.readFileSync(prodComposePath, "utf8");
  for (const svc of testOnlyServices) {
    const regex = new RegExp(`^\\s{2}${svc}:`, "m");
    if (regex.test(prodContent)) {
      console.error(`ERROR: El servicio solo de pruebas '${svc}' aparece en compose.prod.yml`);
      failed = true;
    }
  }
}

// 3. Verificar Dockerfiles de producción
const dockerfiles = [
  "gateway/Dockerfile",
  "web/Dockerfile",
  "services/api/Dockerfile",
  "admin/Dockerfile",
  "postgres/Dockerfile",
];

for (const df of dockerfiles) {
  const fullPath = path.join(root, df);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, "utf8");
    for (const svc of testOnlyServices) {
      if (content.toLowerCase().includes(svc)) {
        console.error(`ERROR: Dockerfile '${df}' contiene referencias al servicio de pruebas '${svc}'`);
        failed = true;
      }
    }
  }
}

// 4. Verificar workflow de publicación y despliegue
if (fs.existsSync(deployWorkflowPath)) {
  const workflow = fs.readFileSync(deployWorkflowPath, "utf8");
  // Extraer las secciones publicar y desplegar
  const publicarIdx = workflow.indexOf("publicar:");
  if (publicarIdx !== -1) {
    const deploySection = workflow.slice(publicarIdx);
    for (const svc of testOnlyServices) {
      if (deploySection.includes(`name: ${svc}`) || deploySection.includes(`-${svc}`)) {
        console.error(`ERROR: El workflow de publicación incluye el servicio de pruebas '${svc}'`);
        failed = true;
      }
    }
  }
}

if (failed) {
  console.error("Fallo la verificación de servicios solo de pruebas.");
  process.exit(1);
}

console.log("PASS: Ningún servicio solo de pruebas está expuesto a producción (check-test-only)");
