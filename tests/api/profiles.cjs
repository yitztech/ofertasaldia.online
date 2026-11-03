const assert = require("node:assert/strict");

const api = process.env.API_URL || "http://127.0.0.1:3001";
const site = process.env.SITE_URL || "http://localhost:8080";

(async () => {
  // 1. Comprobar disponibilidad de la API
  let available = false;
  try {
    const res = await fetch(api + "/api/health", { signal: AbortSignal.timeout(1500) });
    available = res.ok;
  } catch {
    available = false;
  }

  if (!available) {
    console.log("SKIP: API no disponible en " + api + " (la prueba de perfiles requiere el stack activo)");
    return;
  }

  // 2. Probar GET y PUT /api/profiles/me sin autenticación -> 401
  const unauthGet = await fetch(api + "/api/profiles/me");
  assert.equal(unauthGet.status, 401, "GET /api/profiles/me sin sesión debe responder 401");

  const unauthPut = await fetch(api + "/api/profiles/me", {
    method: "PUT",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1" },
    body: JSON.stringify({ description: "Intento no autenticado" }),
  });
  assert.equal(unauthPut.status, 401, "PUT /api/profiles/me sin sesión debe responder 401");

  // 3. Registrar primer usuario para pruebas de perfil
  const emailUser1 = `creador1-${Date.now()}@example.com`;
  const regUser1 = await fetch(api + "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1" },
    body: JSON.stringify({
      name: "Creador Inicial",
      email: emailUser1,
      password: "Password-1234!",
      termsAccepted: true,
    }),
  });
  assert.equal(regUser1.status, 201, "Registro de usuario creador exitoso");
  const cookieUser1 = regUser1.headers.get("set-cookie").split(";")[0];

  // 4. Probar GET /api/profiles/me autenticado (debe inicializar y retornar perfil)
  const myProfileRes = await fetch(api + "/api/profiles/me", {
    headers: { cookie: cookieUser1 },
  });
  assert.equal(myProfileRes.status, 200, "GET /api/profiles/me debe responder 200");
  const myProfile = await myProfileRes.json();
  assert.ok(myProfile.userId, "Debe incluir userId");
  assert.ok(myProfile.alias, "Debe generar o tener un alias");
  assert.equal(myProfile.name, "Creador Inicial");
  assert.equal(myProfile.email, emailUser1);

  // 5. Probar PUT /api/profiles/me con fallo de CSRF -> 403
  const csrfFail = await fetch(api + "/api/profiles/me", {
    method: "PUT",
    headers: { "content-type": "application/json", cookie: cookieUser1 },
    body: JSON.stringify({ description: "Sin cabecera CSRF" }),
  });
  assert.equal(csrfFail.status, 403, "PUT /api/profiles/me sin CSRF debe responder 403");

  // 6. Probar validación de formato y longitud (AGENTS §6.2 y §6.3) -> 422
  const invalidAliasRes = await fetch(api + "/api/profiles/me", {
    method: "PUT",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: cookieUser1 },
    body: JSON.stringify({ alias: "ALIAS_CON_MAYUSCULAS_O_ESPACIOS" }),
  });
  assert.equal(invalidAliasRes.status, 422, "Alias con formato inválido debe responder 422");

  const invalidColorRes = await fetch(api + "/api/profiles/me", {
    method: "PUT",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: cookieUser1 },
    body: JSON.stringify({ accentColor: "rojo-brillante" }),
  });
  assert.equal(invalidColorRes.status, 422, "Color no hexadecimal debe responder 422");

  // 7. Actualizar perfil válidamente -> 200
  const customAlias = `creador-pro-${Date.now().toString().slice(-6)}`;
  const updateRes = await fetch(api + "/api/profiles/me", {
    method: "PUT",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: cookieUser1 },
    body: JSON.stringify({
      alias: customAlias,
      name: "Creador Verificado",
      description: "Especialista en gadgets y tecnología de punta.",
      location: "Guadalajara, Jalisco",
      accentColor: "#10b981",
      socialLinks: [
        { red: "youtube", url: "https://www.youtube.com/@creadortech" },
        { red: "instagram", url: "https://www.instagram.com/creadortech" },
      ],
    }),
  });
  assert.equal(updateRes.status, 200, "Actualización de perfil debe responder 200");
  const updatedProfile = await updateRes.json();
  assert.equal(updatedProfile.alias, customAlias);
  assert.equal(updatedProfile.name, "Creador Verificado");
  assert.equal(updatedProfile.description, "Especialista en gadgets y tecnología de punta.");
  assert.equal(updatedProfile.location, "Guadalajara, Jalisco");
  assert.equal(updatedProfile.accentColor, "#10b981");
  assert.equal(updatedProfile.socialLinks.length, 2);

  // 8. Registrar segundo usuario y probar colisión de alias -> 409
  const emailUser2 = `creador2-${Date.now()}@example.com`;
  const regUser2 = await fetch(api + "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1" },
    body: JSON.stringify({
      name: "Segundo Creador",
      email: emailUser2,
      password: "Password-1234!",
      termsAccepted: true,
    }),
  });
  assert.equal(regUser2.status, 201);
  const cookieUser2 = regUser2.headers.get("set-cookie").split(";")[0];

  const collisionRes = await fetch(api + "/api/profiles/me", {
    method: "PUT",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: cookieUser2 },
    body: JSON.stringify({ alias: customAlias }),
  });
  assert.equal(collisionRes.status, 409, "Intentar usar un alias duplicado debe responder 409");
  const collisionErr = await collisionRes.json();
  assert.equal(collisionErr.code, "alias_already_exists");

  // 9. Consultar perfil público por alias -> 200
  const publicRes = await fetch(api + `/api/profiles/${customAlias}`);
  assert.equal(publicRes.status, 200, "GET /api/profiles/:alias debe responder 200");
  const publicData = await publicRes.json();
  assert.ok(publicData.profile, "Debe contener datos del perfil público");
  assert.equal(publicData.profile.alias, customAlias);
  assert.equal(publicData.profile.nombre, "Creador Verificado");
  assert.ok(Array.isArray(publicData.products), "Debe contener listado de productos");
  assert.ok(Array.isArray(publicData.collections), "Debe contener colecciones");
  assert.ok(publicData.profile.estadisticas, "Debe contener estadísticas del creador");
  assert.ok(Array.isArray(publicData.profile.categorias), "Debe contener desglose de categorías");
  assert.ok(publicData.profile.conteoPlataformas, "Debe contener conteo de plataformas");
  assert.ok(Array.isArray(publicData.profile.conteoPrecios), "Debe contener conteo por rangos de precio");

  // 10. Consultar perfil inexistente -> 404
  const notFoundRes = await fetch(api + "/api/profiles/alias-no-existente-9999");
  assert.equal(notFoundRes.status, 404, "Perfil no encontrado debe responder 404");
  const notFoundErr = await notFoundRes.json();
  assert.equal(notFoundErr.code, "profile_not_found");

  console.log("PASS: Pruebas de perfiles de creador completadas con éxito");
})();
