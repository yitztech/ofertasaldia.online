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
    console.log("SKIP: API no disponible en " + api + " (la prueba de redirección requiere el stack activo)");
    return;
  }

  // 2. Obtener un producto activo del catálogo
  const prodRes = await fetch(api + "/api/products?limit=1");
  assert.equal(prodRes.status, 200, "Debe obtener productos del catálogo");
  const prodData = await prodRes.json();
  assert.ok(Array.isArray(prodData.items) && prodData.items.length > 0, "Debe haber productos disponibles");
  const testProduct = prodData.items[0];

  // 3. Probar GET /ir/:id (redirección limpia)
  const redirectRes = await fetch(`${api}/ir/${testProduct.id}`, {
    redirect: "manual",
  });
  assert.equal(redirectRes.status, 302, "GET /ir/:id debe responder HTTP 302");
  const locationHeader = redirectRes.headers.get("location");
  assert.ok(locationHeader, "Debe incluir cabecera Location");
  assert.equal(locationHeader, testProduct.affiliateUrl || "https://www.mercadolibre.com.mx");
  assert.equal(redirectRes.headers.get("cache-control"), "no-store", "Debe tener Cache-Control: no-store (§26)");
  assert.equal(redirectRes.headers.get("x-robots-tag"), "noindex, nofollow", "Debe tener X-Robots-Tag: noindex, nofollow");

  // 4. Probar GET /api/redirect/:id (ruta bajo /api/)
  const apiRedirectRes = await fetch(`${api}/api/redirect/${testProduct.id}?o=ficha`, {
    redirect: "manual",
  });
  assert.equal(apiRedirectRes.status, 302, "GET /api/redirect/:id debe responder HTTP 302");
  assert.equal(apiRedirectRes.headers.get("location"), locationHeader);

  // 5. Probar producto no encontrado o id no válido (RFC 9457)
  const noProductRes = await fetch(`${api}/ir/00000000-0000-0000-0000-000000000000`, {
    redirect: "manual",
  });
  assert.equal(noProductRes.status, 404, "Producto inexistente debe responder 404");
  const noProductBody = await noProductRes.json();
  assert.equal(noProductBody.code, "product_not_found");

  const invalidIdRes = await fetch(`${api}/ir/invalido-uuid`, {
    redirect: "manual",
  });
  assert.equal(invalidIdRes.status, 404, "UUID inválido debe responder 404");

  // 6. Probar GET /api/profiles/me/analytics sin sesión -> 401
  const unauthAnalytics = await fetch(`${api}/api/profiles/me/analytics`);
  assert.equal(unauthAnalytics.status, 401, "GET /api/profiles/me/analytics sin autenticación debe responder 401");

  // 7. Registrar un nuevo creador para pruebas de atribución y analítica
  const emailCreator = `creador-metricas-${Date.now()}@example.com`;
  const regRes = await fetch(`${api}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1" },
    body: JSON.stringify({
      name: "Creador Analitica",
      email: emailCreator,
      password: "Password-1234!",
      termsAccepted: true,
    }),
  });
  assert.equal(regRes.status, 201, "Registro de creador exitoso");
  const creatorCookie = regRes.headers.get("set-cookie").split(";")[0];

  // Obtener perfil y alias del creador
  const profileRes = await fetch(`${api}/api/profiles/me`, {
    headers: { cookie: creatorCookie },
  });
  assert.equal(profileRes.status, 200);
  const profileData = await profileRes.json();
  const creatorAlias = profileData.alias;
  assert.ok(creatorAlias, "El creador debe tener un alias asignado");

  // 8. Consultar analítica inicial (debe tener 0 clics)
  const initialAnalyticsRes = await fetch(`${api}/api/profiles/me/analytics`, {
    headers: { cookie: creatorCookie },
  });
  assert.equal(initialAnalyticsRes.status, 200, "Debe obtener analítica del creador");
  const initialAnalytics = await initialAnalyticsRes.json();
  assert.equal(initialAnalytics.summary.clics, 0, "El creador nuevo debe iniciar con 0 clics");
  assert.equal(initialAnalytics.summary.productosVistos, 0);
  assert.ok(Array.isArray(initialAnalytics.dailyClicks), "dailyClicks debe ser un array");
  assert.equal(initialAnalytics.dailyClicks.length, 30, "dailyClicks debe contener los últimos 30 días");

  // 9. Registrar clic real con atribución de creador y origen
  const trackedClickRes = await fetch(`${api}/ir/${testProduct.id}?c=${creatorAlias}&o=pagina`, {
    headers: { "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    redirect: "manual",
  });
  assert.equal(trackedClickRes.status, 302, "Redirección con atribución debe responder 302");

  // 10. Verificar que el clic fue atribuido y contabilizado
  const updatedAnalyticsRes = await fetch(`${api}/api/profiles/me/analytics`, {
    headers: { cookie: creatorCookie },
  });
  assert.equal(updatedAnalyticsRes.status, 200);
  const updatedAnalytics = await updatedAnalyticsRes.json();
  assert.equal(updatedAnalytics.summary.clics, 1, "Debe registrar exactamente 1 clic para el creador");
  assert.equal(updatedAnalytics.summary.productosVistos, 1, "Debe registrar 1 producto único visto");
  assert.equal(updatedAnalytics.productClicks[testProduct.id], 1, "El producto específico debe tener 1 clic registrado");

  // 11. Probar que los bots no incrementan las métricas
  const botClickRes = await fetch(`${api}/ir/${testProduct.id}?c=${creatorAlias}&o=portada`, {
    headers: { "user-agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
    redirect: "manual",
  });
  assert.equal(botClickRes.status, 302, "Bot recibe 302 normal");

  const afterBotAnalyticsRes = await fetch(`${api}/api/profiles/me/analytics`, {
    headers: { cookie: creatorCookie },
  });
  const afterBotAnalytics = await afterBotAnalyticsRes.json();
  assert.equal(afterBotAnalytics.summary.clics, 1, "El bot no debe incrementar el contador de clics");

  console.log("PASS: Redirección de afiliados y tracking de clics validados con éxito");
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
