const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");
const root = process.env.TARGET_URL || "http://localhost:8080";
const results = path.join(process.cwd(), "tests/e2e/results");
fs.mkdirSync(results, { recursive: true });
fs.rmSync(path.join(results, "failure.txt"), { force: true });
function mail(email) {
  const script = `fetch('http://mailpit:8025/api/v1/messages').then(r=>r.json()).then(async list=>{const m=list.messages.find(m=>m.To.some(t=>t.Address===${JSON.stringify(email)}));if(!m)return console.log('null');console.log(JSON.stringify(await(await fetch('http://mailpit:8025/api/v1/message/'+m.ID)).json()))})`;
  return JSON.parse(
    execFileSync(
      "docker",
      [
        "compose",
        "-f",
        "compose.dev.yml",
        "exec",
        "-T",
        "api",
        "node",
        "-e",
        script,
      ],
      { encoding: "utf8" },
    ),
  );
}
(async () => {
  assert.ok(
    ["localhost", "127.0.0.1"].includes(new URL(root).hostname),
    "Esta prueba solo permite entorno local",
  );
  execFileSync("docker", [
    "compose",
    "-f",
    "compose.dev.yml",
    "exec",
    "-T",
    "postgres",
    "psql",
    "-U",
    "ofertas",
    "-d",
    "ofertas",
    "-c",
    "DELETE FROM auth_attempts",
  ]);
  const browser = await chromium.launch({ headless: !!process.env.CI });
  const errors = [];
  const checks = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.setDefaultNavigationTimeout(15000);
    page.on("pageerror", (e) => errors.push(e.message));
    const email = `browser-${Date.now()}@example.com`;
    const password = "Initial123!";
    await page.goto(root + "/panel");
    await page.waitForURL("**/entrar");
    checks.push("panel sin sesión redirige");
    await page.goto(root + "/registro");
    await page.locator("#nombre").fill("María Pérez");
    await page.locator("#correo").fill(email);
    await page.locator("#contrasena").fill(password);
    await page
      .getByRole("button", { name: "Crear cuenta", exact: true })
      .click();
    await page
      .getByText("Debes aceptar los términos para continuar.")
      .waitFor();
    checks.push("validación de términos");
    await page.locator("[name=terminos]").check();
    await page
      .getByRole("button", { name: "Crear cuenta", exact: true })
      .click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.getByLabel("Cuenta de María Pérez").waitFor();
    checks.push("registro redirige a portada logueado");
    await page.goto(root + "/entrar");
    await page.locator("#correo").fill(email);
    await page.locator("#contrasena").fill("Wrong123!");
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "No se pudo iniciar sesión" })
      .waitFor();
    checks.push("contraseña incorrecta rechazada");
    await page.locator("#contrasena").fill(password);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.waitForURL((url) => url.pathname === "/");
    await page.getByLabel("Cuenta de María Pérez").waitFor();
    checks.push("login redirige a portada logueado");
    await page.getByLabel("Cuenta de María Pérez").click();
    await page.waitForURL("**/panel");
    checks.push("panel accesible desde cabecera");
    await page.goto(root + "/admin/");
    await page
      .getByRole("alert")
      .filter({ hasText: "no tiene permisos" })
      .waitFor();
    checks.push("admin denegado a usuario normal");
    await page.goto(root + "/recuperar");
    await page.locator("#correo").fill(email);
    await page
      .getByRole("button", { name: "Enviar enlace", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Si el correo" })
      .waitFor();
    let message;
    for (let i = 0; i < 25; i++) {
      message = mail(email);
      if (message) break;
      await page.waitForTimeout(1000);
    }
    assert.ok(message);
    checks.push("correo en Mailpit");
    const link = message.Text.match(/https?:\/\/\S+/)[0];
    await page.goto(link);
    await page.locator("#contrasena").fill("Changed123!");
    await page.locator("#confirmacion").fill("Changed123!");
    await page
      .getByRole("button", { name: "Restablecer contraseña", exact: true })
      .click();
    await page.waitForURL("**/entrar?restablecida=1");
    checks.push("reset");
    assert.equal(
      (await context.request.get(root + "/api/auth/me")).status(),
      401,
    );
    checks.push("sesión anterior revocada");
    await page.goto(link);
    await page.locator("#contrasena").fill("Changed123!");
    await page.locator("#confirmacion").fill("Changed123!");
    await page
      .getByRole("button", { name: "Restablecer contraseña", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "El enlace no es válido" })
      .waitFor();
    checks.push("token reutilizado rechazado");
    await page.goto(root + "/entrar?next=/admin/");
    await page.locator("#correo").fill(email);
    await page.locator("#contrasena").fill("Changed123!");
    // Fixture local: convertir solamente este usuario QA en admin para probar la interfaz.
    execFileSync("docker", [
      "compose",
      "-f",
      "compose.dev.yml",
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "ofertas",
      "-d",
      "ofertas",
      "-c",
      `UPDATE users SET role='admin' WHERE email='${email}'`,
    ]);
    await page
      .getByRole("button", { name: "Iniciar sesión", exact: true })
      .click();
    await page.waitForURL("**/admin/");
    await page.getByRole("heading", { name: "Usuarios y planes" }).waitFor();
    await page.getByRole("cell", { name: email, exact: true }).waitFor();
    checks.push("admin autorizado y listado real");
    await page.screenshot({
      path: path.join(results, "admin-desktop.png"),
      fullPage: true,
    });
    const other = `member-${Date.now()}@example.com`;
    const apiContext = await browser.newContext();
    const registration = await apiContext.request.post(
      root + "/api/auth/register",
      {
        headers: { origin: root, "x-csrf": "1" },
        data: {
          email: other,
          password: "Initial123!",
          name: "Ana Pérez",
          termsAccepted: true,
        },
      },
    );
    assert.equal(registration.status(), 201);
    await apiContext.close();
    await page.locator("#admin-search").fill(other);
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    const row = page.getByRole("row").filter({ hasText: other });
    await row.getByRole("cell", { name: other, exact: true }).waitFor();
    const expiry = new Date(Date.now() + 30 * 86400000)
      .toISOString()
      .slice(0, 10);
    await row.locator("input[type=date]").fill(expiry);
    await row
      .getByRole("button", { name: "Activar plan", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Cambio guardado" })
      .waitFor();
    await row.getByText("Sin plan activo").waitFor({ state: "hidden" });
    checks.push("activación manual de plan");
    await row.getByRole("button", { name: "Suspender", exact: true }).click();
    await row.getByRole("button", { name: "Reactivar", exact: true }).waitFor();
    checks.push("suspensión");
    await page.getByRole("button", { name: "Auditoría", exact: true }).click();
    await page
      .getByRole("cell", { name: "user_suspended", exact: true })
      .first()
      .waitFor();
    checks.push("auditoría");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: path.join(results, "admin-mobile.png"),
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    checks.push("admin móvil sin overflow de página");
    await page.getByRole("button", { name: "Productos", exact: true }).click();
    await page.getByRole("heading", { name: "Catálogo publicado" }).waitFor();
    checks.push("catálogo admin");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(results, "forms.json"),
      JSON.stringify({ passed: true, checks, errors }, null, 2),
    );
    console.log(JSON.stringify({ passed: true, checks }, null, 2));
  } catch (error) {
    fs.writeFileSync(path.join(results, "failure.txt"), String(error));
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
