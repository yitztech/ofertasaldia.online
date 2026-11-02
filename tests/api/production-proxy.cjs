const http = require("node:http");
function fetch(url, options) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      url,
      { method: options.method, headers: options.headers },
      (res) => {
        res.resume();
        resolve({
          status: res.statusCode,
          headers: {
            get: (key) => {
              const value = res.headers[key.toLowerCase()];
              return Array.isArray(value) ? value.join(";") : value;
            },
          },
        });
      },
    );
    req.on("error", reject);
    req.end(options.body.toString());
  });
}
const assert = require("node:assert/strict");
(async () => {
  const email = `proxy-${Date.now()}@example.com`;
  const headers = {
    host: "ci.example.test",
    "x-forwarded-proto": "https",
    origin: "https://ci.example.test",
    "content-type": "application/x-www-form-urlencoded",
  };
  const register = await fetch("http://gateway/registro", {
    method: "POST",
    redirect: "manual",
    headers,
    body: new URLSearchParams({
      nombre: "María Pérez",
      correo: email,
      contrasena: "Initial123!",
      terminos: "on",
    }),
  });
  assert.equal(register.status, 302);
  assert.equal(register.headers.get("location"), "/");
  const regCookie = register.headers.get("set-cookie");
  assert.ok(regCookie.startsWith("__Host-session="));
  assert.match(regCookie, /HttpOnly/i);
  assert.match(regCookie, /Secure/i);
  assert.match(regCookie, /SameSite=Lax/i);

  const dupRegister = await fetch("http://gateway/registro", {
    method: "POST",
    redirect: "manual",
    headers,
    body: new URLSearchParams({
      nombre: "María Pérez",
      correo: email,
      contrasena: "OtherPassword123!",
      terminos: "on",
    }),
  });
  assert.equal(dupRegister.status, 200, "registro duplicado no redirige; muestra error en el formulario");
  assert.ok(!dupRegister.headers.get("set-cookie"), "registro duplicado no debe emitir cookie de sesión");

  const loginDefault = await fetch("http://gateway/entrar", {
    method: "POST",
    redirect: "manual",
    headers,
    body: new URLSearchParams({ correo: email, contrasena: "Initial123!" }),
  });
  assert.equal(loginDefault.status, 302);
  assert.equal(loginDefault.headers.get("location"), "/");
  const defaultCookie = loginDefault.headers.get("set-cookie");
  assert.ok(defaultCookie.startsWith("__Host-session="));

  const login = await fetch("http://gateway/entrar?next=/admin/", {
    method: "POST",
    redirect: "manual",
    headers,
    body: new URLSearchParams({ correo: email, contrasena: "Initial123!" }),
  });
  assert.equal(login.status, 302);
  assert.equal(login.headers.get("location"), "/admin/");
  const cookie = login.headers.get("set-cookie");
  assert.ok(cookie.startsWith("__Host-session="));
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Lax/i);
  console.log(
    "PASS: registro y login redirigen a portada con cookie segura de producción",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
