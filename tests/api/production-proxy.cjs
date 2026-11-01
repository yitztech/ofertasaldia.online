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
  assert.equal(register.headers.get("location"), "/entrar");
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
    "PASS: formularios detrás de proxy HTTPS y cookie segura de producción",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
