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
    const res = await fetch(api + "/healthz", { signal: AbortSignal.timeout(1500) });
    available = res.ok;
  } catch {
    available = false;
  }

  if (!available) {
    console.log("SKIP: API no disponible en " + api + " (la prueba de pagos requiere el stack activo)");
    return;
  }

  // 2. Probar GET /api/payments/plans
  const plansRes = await fetch(api + "/api/payments/plans");
  assert.equal(plansRes.status, 200, "GET /api/payments/plans debe responder 200");
  const plansData = await plansRes.json();
  assert.ok(Array.isArray(plansData.plans), "Debe contener una lista de planes");
  assert.ok(plansData.plans.length >= 2, "Debe tener al menos plan básico y pro");

  const planGratuito = plansData.plans.find((p) => p.id === "gratuito");
  const planPro = plansData.plans.find((p) => p.id === "pro");
  assert.ok(planGratuito, "Debe existir plan gratuito");
  assert.ok(planPro, "Debe existir plan pro");
  assert.equal(planGratuito.priceCents, 0, "Plan gratuito tiene precio 0");
  assert.equal(planGratuito.currency, "MXN", "Moneda debe ser MXN");
  assert.equal(planPro.priceCents, 29900, "Plan Pro cuesta 29900 centavos ($299.00 MXN)");
  assert.equal(planPro.currency, "MXN", "Moneda debe ser MXN");
  for (const p of plansData.plans) {
    assert.ok(Number.isInteger(p.priceCents) && p.priceCents >= 0, "Todos los precios deben ser enteros en centavos (§21)");
  }

  // 3. Probar GET /api/payments/subscription sin autenticación (401)
  const unauthSub = await fetch(api + "/api/payments/subscription");
  assert.equal(unauthSub.status, 401, "GET /api/payments/subscription sin sesión responde 401");

  // 4. Registrar usuario para pruebas de suscripción
  const email = `payments-${Date.now()}@example.com`;
  const regRes = await fetch(api + "/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: site,
      "x-csrf": "1",
    },
    body: JSON.stringify({
      name: "Juan Pagos",
      email,
      password: "Password-1234!",
      termsAccepted: true,
    }),
  });
  assert.equal(regRes.status, 201, "Registro de usuario exitoso");
  const cookie = regRes.headers.get("set-cookie").split(";")[0];

  // Obtener ID del usuario registrado
  const meRes = await fetch(api + "/api/auth/me", { headers: { cookie } });
  assert.equal(meRes.status, 200);
  const me = await meRes.json();
  const userId = me.id;

  // 5. Suscripción inicial debe ser gratuita / inactiva
  const initialSubRes = await fetch(api + "/api/payments/subscription", { headers: { cookie } });
  assert.equal(initialSubRes.status, 200);
  const initialSub = await initialSubRes.json();
  assert.equal(initialSub.status, "none");
  assert.equal(initialSub.planId, "gratuito");

  // 6. Probar POST /api/payments/checkout-session
  // 6.1 Sin CSRF -> 403
  const noCsrfRes = await fetch(api + "/api/payments/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, cookie },
    body: JSON.stringify({ planId: "pro" }),
  });
  assert.equal(noCsrfRes.status, 403, "Rechaza sin x-csrf");

  // 6.2 Con plan inválido -> 422
  const badPlanRes = await fetch(api + "/api/payments/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie },
    body: JSON.stringify({ planId: "inexistente" }),
  });
  assert.equal(badPlanRes.status, 422, "Rechaza plan inválido con 422");

  // 6.3 Petición válida -> 200 con url y sessionId
  const checkoutRes = await fetch(api + "/api/payments/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie },
    body: JSON.stringify({ planId: "pro" }),
  });
  assert.equal(checkoutRes.status, 200, "Crea sesión de checkout con 200");
  const checkoutData = await checkoutRes.json();
  assert.ok(typeof checkoutData.url === "string", "Debe devolver url");
  assert.ok(typeof checkoutData.sessionId === "string", "Debe devolver sessionId");

  // 7. Probar Webhooks (POST /api/public/v1/webhooks/payments)
  const webhookUrl = api + "/api/public/v1/webhooks/payments";

  // 7.1 Sin firma -> 400
  const noSigRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "evt_1", type: "test" }),
  });
  assert.equal(noSigRes.status, 400, "Rechaza webhook sin stripe-signature con 400");

  // 7.2 Firma errónea -> 400
  const badSigRes = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": "t=123456,v1=abcdef0123456789",
    },
    body: JSON.stringify({ id: "evt_1", type: "test" }),
  });
  assert.equal(badSigRes.status, 400, "Rechaza webhook con firma errónea con 400");

  // 7.3 Evento checkout.session.completed válido
  const eventId = "evt_checkout_" + Date.now();
  const subId = "sub_stripe_" + Date.now();
  const eventPayload = {
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_stripe_" + Date.now(),
        client_reference_id: userId,
        customer: "cus_stripe_" + Date.now(),
        subscription: subId,
        metadata: {
          user_id: userId,
          plan_id: "pro",
        },
      },
    },
  };
  const payloadString = JSON.stringify(eventPayload);
  const validSignature = signPayload(payloadString);

  const webhookSuccessRes = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": validSignature,
    },
    body: payloadString,
  });
  assert.equal(webhookSuccessRes.status, 200, "Webhook procesa evento válido con 200");
  const webhookSuccessData = await webhookSuccessRes.json();
  assert.equal(webhookSuccessData.received, true);

  // 7.4 Idempotencia: enviar el mismo evento exacto de nuevo
  const duplicateRes = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": validSignature,
    },
    body: payloadString,
  });
  assert.equal(duplicateRes.status, 200);
  const duplicateData = await duplicateRes.json();
  assert.equal(duplicateData.received, true);
  assert.equal(duplicateData.duplicate, true, "Evento repetido debe marcarse como duplicado sin error (§21)");

  // 7.5 Verificar que la suscripción ahora está activa
  const activeSubRes = await fetch(api + "/api/payments/subscription", { headers: { cookie } });
  assert.equal(activeSubRes.status, 200);
  const activeSub = await activeSubRes.json();
  assert.equal(activeSub.status, "active", "La suscripción debe estar activa tras el webhook");
  assert.equal(activeSub.planId, "pro", "El plan debe ser pro");
  assert.ok(activeSub.expiresAt, "Debe tener fecha de expiración");

  // 7.6 Evento customer.subscription.deleted revoca la suscripción
  const delEventId = "evt_cancel_" + Date.now();
  const delPayload = {
    id: delEventId,
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: subId,
      },
    },
  };
  const delPayloadString = JSON.stringify(delPayload);
  const delSignature = signPayload(delPayloadString);

  const delRes = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": delSignature,
    },
    body: delPayloadString,
  });
  assert.equal(delRes.status, 200);

  // 7.7 Verificar que la suscripción quedó cancelada / revertida a ninguno
  const canceledSubRes = await fetch(api + "/api/payments/subscription", { headers: { cookie } });
  assert.equal(canceledSubRes.status, 200);
  const canceledSub = await canceledSubRes.json();
  assert.equal(canceledSub.status, "none", "La suscripción revocada debe volver a status 'none'");

  console.log("PASS: Planes MXN, suscripciones, checkout session, webhooks HMAC, idempotencia y cancelación");
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
