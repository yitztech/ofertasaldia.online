const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const api = process.env.API_URL || "http://127.0.0.1:3001";
const site = process.env.SITE_URL || "http://localhost:8080";
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_local_secret";

function signPayload(payloadString, secret = webhookSecret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${payloadString}`)
    .digest("hex");
  return `t=${timestamp},v1=${signature}`;
}

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
    console.log("SKIP: API no disponible en " + api + " (la prueba de artículos requiere el stack activo)");
    return;
  }

  // 2. Probar GET /api/articles (público)
  const listRes = await fetch(api + "/api/articles");
  assert.equal(listRes.status, 200, "GET /api/articles debe responder 200");
  const listData = await listRes.json();
  assert.ok(Array.isArray(listData.items), "Debe contener una lista de artículos");

  // 3. POST /api/articles sin sesión responde 401
  const unauthPost = await fetch(api + "/api/articles", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1" },
    body: JSON.stringify({
      title: "Review de MacBook Pro M3",
      summary: "Una reseña completa del rendimiento y batería",
      content: "Contenido detallado con pruebas de rendimiento...",
      status: "published",
    }),
  });
  assert.equal(unauthPost.status, 401, "POST /api/articles sin sesión debe dar 401");

  // 4. Registrar usuario gratuito
  const emailFree = `blogger-free-${Date.now()}@example.com`;
  const regFreeRes = await fetch(api + "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1" },
    body: JSON.stringify({
      name: "Usuario Gratuito",
      email: emailFree,
      password: "Password-1234!",
      termsAccepted: true,
    }),
  });
  assert.equal(regFreeRes.status, 201, "Registro de usuario gratuito exitoso");
  const freeCookie = regFreeRes.headers.get("set-cookie").split(";")[0];

  // 5. Usuario gratuito intenta publicar -> 403 pro_subscription_required
  const freeCreateRes = await fetch(api + "/api/articles", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: freeCookie },
    body: JSON.stringify({
      title: "Review de prueba gratuita",
      summary: "Este intento debe ser rechazado por falta de suscripción pro",
      content: "Contenido de prueba para verificar la restricción de plan de pago...",
      status: "published",
    }),
  });
  assert.equal(freeCreateRes.status, 403, "Usuario gratuito debe recibir 403 al intentar publicar artículos");
  const freeErr = await freeCreateRes.json();
  assert.equal(freeErr.code, "pro_subscription_required", "Código de error debe ser pro_subscription_required");

  // 6. Registrar usuario Pro y activar suscripción vía webhook
  const emailPro = `blogger-pro-${Date.now()}@example.com`;
  const regProRes = await fetch(api + "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1" },
    body: JSON.stringify({
      name: "Blogger Profesional",
      email: emailPro,
      password: "Password-1234!",
      termsAccepted: true,
    }),
  });
  assert.equal(regProRes.status, 201);
  const proCookie = regProRes.headers.get("set-cookie").split(";")[0];

  // Obtener userId Pro
  const meRes = await fetch(api + "/api/auth/me", { headers: { cookie: proCookie } });
  const me = await meRes.json();
  const proUserId = me.id;

  // Simular webhook de Stripe para activar Pro
  const stripeSubId = `sub_test_${Date.now()}`;
  const stripeCustId = `cus_test_${Date.now()}`;
  const checkoutEvent = {
    id: `evt_chk_${Date.now()}`,
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${Date.now()}`,
        client_reference_id: proUserId,
        customer: stripeCustId,
        subscription: stripeSubId,
        metadata: { userId: proUserId, planId: "pro" },
      },
    },
  };
  const rawPayload = JSON.stringify(checkoutEvent);
  const signature = signPayload(rawPayload);

  const hookRes = await fetch(api + "/api/public/v1/webhooks/payments", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: rawPayload,
  });
  assert.equal(hookRes.status, 200, "Webhook debe procesar activación Pro");

  // Verificar que ahora tiene suscripción activa
  const subRes = await fetch(api + "/api/payments/subscription", { headers: { cookie: proCookie } });
  const subData = await subRes.json();
  assert.equal(subData.status, "active", "El usuario debe tener suscripción activa");
  assert.equal(subData.planId, "pro", "El plan debe ser pro");

  // 7. Pruebas de validación y CSRF con usuario Pro
  // 7.1 Sin CSRF -> 403
  const noCsrfRes = await fetch(api + "/api/articles", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, cookie: proCookie },
    body: JSON.stringify({
      title: "Review sin CSRF",
      summary: "Resumen de prueba sin header CSRF",
      content: "Contenido de longitud válida...",
      status: "draft",
    }),
  });
  assert.equal(noCsrfRes.status, 403, "Rechaza sin header CSRF");

  // 7.2 Con título demasiado corto -> 422
  const shortTitleRes = await fetch(api + "/api/articles", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: proCookie },
    body: JSON.stringify({
      title: "Hola",
      summary: "Resumen con longitud adecuada para pasar validación",
      content: "Contenido de longitud válida para la prueba...",
      status: "draft",
    }),
  });
  assert.equal(shortTitleRes.status, 422, "Rechaza título menor a 5 caracteres");

  // 8. Crear artículo en borrador (draft)
  const draftRes = await fetch(api + "/api/articles", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: proCookie },
    body: JSON.stringify({
      title: "Borrador de prueba interna",
      summary: "Este es un borrador que no debe ser visible públicamente",
      content: "Contenido completo del borrador esperando revisión...",
      status: "draft",
    }),
  });
  assert.equal(draftRes.status, 201, "Debe crear el borrador exitosamente");
  const draftData = await draftRes.json();
  assert.ok(draftData.id, "Borrador debe tener ID");
  assert.equal(draftData.status, "draft");
  const draftSlug = draftData.slug;

  // Verificar que el borrador no sale en la lista pública
  const publicListAfterDraft = await fetch(api + "/api/articles");
  const publicListJson = await publicListAfterDraft.json();
  const draftInPublic = publicListJson.items.find((a) => a.id === draftData.id);
  assert.equal(draftInPublic, undefined, "El borrador no debe aparecer en el listado público");

  // 9. Crear artículo publicado (published)
  const publishedRes = await fetch(api + "/api/articles", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: proCookie },
    body: JSON.stringify({
      title: "Sony WH-1000XM5: Análisis tras 6 meses de uso diario",
      summary: "Probamos los auriculares con cancelación de ruido de Sony a fondo: batería, sonido y comodidad.",
      content: "## Introducción\nLos Sony WH-1000XM5 destacan por su cancelación activa.\n\n### Lo mejor y lo peor\nExcelente autonomía pero no se pliegan por completo.\n\n> Veredicto: Compra muy recomendada.",
      category: "tecnologia",
      status: "published",
    }),
  });
  assert.equal(publishedRes.status, 201, "Debe crear el artículo publicado");
  const publishedData = await publishedRes.json();
  assert.ok(publishedData.id);
  assert.equal(publishedData.status, "published");
  const articleSlug = publishedData.slug;
  const articleId = publishedData.id;

  // 10. Probar GET /api/articles/:slug (detalle público)
  const detailRes = await fetch(`${api}/api/articles/${articleSlug}`);
  assert.equal(detailRes.status, 200, "Debe retornar el artículo publicado");
  const detailData = await detailRes.json();
  assert.equal(detailData.id, articleId);
  assert.equal(detailData.title, "Sony WH-1000XM5: Análisis tras 6 meses de uso diario");
  assert.ok(detailData.authorName, "Debe incluir nombre del autor");
  assert.equal(detailData.authorName, "Blogger Profesional");

  // 11. Probar GET /api/articles/my-articles (autor ve borradores y publicados)
  const myArticlesRes = await fetch(api + "/api/articles/my-articles", {
    headers: { cookie: proCookie },
  });
  assert.equal(myArticlesRes.status, 200);
  const myArticlesData = await myArticlesRes.json();
  assert.ok(myArticlesData.articles.some((a) => a.id === draftData.id), "Autor debe ver su borrador");
  assert.ok(myArticlesData.articles.some((a) => a.id === articleId), "Autor debe ver su artículo publicado");

  // 12. Probar PUT /api/articles/:id (edición)
  // 12.1 Usuario ajeno intenta editar -> 403
  const unauthorizedEditRes = await fetch(`${api}/api/articles/${articleId}`, {
    method: "PUT",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: freeCookie },
    body: JSON.stringify({
      title: "Intento de modificación maliciosa",
      summary: "Modificación no autorizada de artículo ajeno",
      content: "Contenido cambiado sin autorización...",
      status: "published",
    }),
  });
  assert.equal(unauthorizedEditRes.status, 403, "No puede modificar artículo ajeno");

  // 12.2 Autor edita su artículo
  const editRes = await fetch(`${api}/api/articles/${articleId}`, {
    method: "PUT",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie: proCookie },
    body: JSON.stringify({
      title: "Sony WH-1000XM5: Análisis definitivo tras 6 meses",
      summary: "Edición actualizada con las últimas pruebas de firmware y cancelación de ruido.",
      content: "## Actualización\nProbamos con el nuevo firmware 2.0 y la estabilidad bluetooth mejoró notablemente.",
      status: "published",
    }),
  });
  assert.equal(editRes.status, 200, "Autor puede editar su propio artículo");
  const updatedData = await editRes.json();
  assert.equal(updatedData.title, "Sony WH-1000XM5: Análisis definitivo tras 6 meses");

  // 13. Probar DELETE /api/articles/:id (eliminación)
  // 13.1 Borrar borrador
  const delDraftRes = await fetch(`${api}/api/articles/${draftData.id}`, {
    method: "DELETE",
    headers: { origin: site, "x-csrf": "1", cookie: proCookie },
  });
  assert.equal(delDraftRes.status, 200, "Eliminación exitosa responde 200");

  // 14. Limpiar artículo publicado
  const delPublishedRes = await fetch(`${api}/api/articles/${articleId}`, {
    method: "DELETE",
    headers: { origin: site, "x-csrf": "1", cookie: proCookie },
  });
  assert.equal(delPublishedRes.status, 200);

  // Confirmar que ya no existe (404)
  const notFoundRes = await fetch(`${api}/api/articles/${articleSlug}`);
  assert.equal(notFoundRes.status, 404, "Artículo eliminado debe responder 404");

  console.log("PASS: Pruebas de API para artículos y blog completadas exitosamente");
})();
