const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const api = process.env.API_URL || "http://127.0.0.1:3001";
const site = process.env.SITE_URL || "http://localhost:8080";
const isProduction = process.env.NODE_ENV === "production";
const hasStripeSecretKey = Boolean((process.env.STRIPE_SECRET_KEY || "").trim());
const configuredWebhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

function signPayload(payloadString, secret) {
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

  // 6.3 Petición con cobro (> 0 MXN):
  // En producción sin STRIPE_SECRET_KEY debe fallar con 503 payment_unavailable (nunca simular cobros).
  // En desarrollo local permite sesión simulada con 200.
  const checkoutRes = await fetch(api + "/api/payments/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie },
    body: JSON.stringify({ planId: "pro" }),
  });
  if (isProduction && !hasStripeSecretKey) {
    assert.equal(
      checkoutRes.status,
      503,
      "En producción sin STRIPE_SECRET_KEY el pago debe fallar con 503 (modo simulado desactivado)",
    );
    const errBody = await checkoutRes.json();
    assert.equal(errBody.code, "payment_unavailable");
  } else {
    assert.equal(checkoutRes.status, 200, "Crea sesión de checkout con 200");
    const checkoutData = await checkoutRes.json();
    assert.ok(typeof checkoutData.url === "string", "Debe devolver url");
    assert.ok(typeof checkoutData.sessionId === "string", "Debe devolver sessionId");
  }

  // 7. Probar Webhooks (POST /api/public/v1/webhooks/payments)
  const webhookUrl = api + "/api/public/v1/webhooks/payments";

  // 7.1 Sin firma -> 400
  const noSigRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "evt_1", type: "test" }),
  });
  assert.equal(noSigRes.status, 400, "Rechaza webhook sin stripe-signature con 400");

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

  if (configuredWebhookSecret) {
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
    const validSignature = signPayload(payloadString, configuredWebhookSecret);
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
    const delSignature = signPayload(delPayloadString, configuredWebhookSecret);
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
  } else {
    // Sin STRIPE_WEBHOOK_SECRET configurado en el contenedor:
    // El endpoint HTTP rechaza cualquier intento con 503 payment_unavailable (sin secreto por defecto)
    const unconfiguredSigRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "stripe-signature": signPayload(payloadString, "whsec_test_local_secret"),
      },
      body: payloadString,
    });
    assert.equal(
      unconfiguredSigRes.status,
      503,
      "Sin STRIPE_WEBHOOK_SECRET configurado, el webhook debe rechazar con 503 (sin secreto por defecto)",
    );

    // Además, probamos la lógica interna de HMAC, idempotencia y revocación de stripe_simulated contra PostgreSQL
    const dbModulePath = path.resolve(process.cwd(), "dist/database.js");
    const paymentsModulePath = path.resolve(process.cwd(), "dist/payments.js");
    if (fs.existsSync(dbModulePath) && fs.existsSync(paymentsModulePath)) {
      const { Database } = require(dbModulePath);
      const { PaymentsService } = require(paymentsModulePath);
      const db = new Database();
      const payments = new PaymentsService(db);
      const ephemeralSecret = "whsec_ci_ephemeral_" + Date.now();
      process.env.STRIPE_WEBHOOK_SECRET = ephemeralSecret;
      try {
        await assert.rejects(
          () => payments.handleWebhook(Buffer.from(payloadString), "t=123456,v1=abcdef0123456789", payloadString),
          (err) => err && err.status === 400,
          "Firma inválida en handleWebhook debe lanzar 400",
        );

        const validSig = signPayload(payloadString, ephemeralSecret);
        const res1 = await payments.handleWebhook(Buffer.from(payloadString), validSig, JSON.parse(payloadString));
        assert.equal(res1.received, true);

        const resDup = await payments.handleWebhook(Buffer.from(payloadString), validSig, JSON.parse(payloadString));
        assert.equal(resDup.received, true);
        assert.equal(resDup.duplicate, true);

        const activeSubRes = await fetch(api + "/api/payments/subscription", { headers: { cookie } });
        const activeSub = await activeSubRes.json();
        assert.equal(activeSub.status, "active");
        assert.equal(activeSub.planId, "pro");

        const delSig = signPayload(delPayloadString, ephemeralSecret);
        await payments.handleWebhook(Buffer.from(delPayloadString), delSig, JSON.parse(delPayloadString));

        const canceledSubRes = await fetch(api + "/api/payments/subscription", { headers: { cookie } });
        const canceledSub = await canceledSubRes.json();
        assert.equal(canceledSub.status, "none");

        // Verificar que una suscripción stripe_simulated nunca se considera activa en producción
        if (isProduction) {
          await db.pool.query(
            `INSERT INTO subscriptions (id, user_id, plan_id, starts_at, expires_at, provider, provider_subscription_id)
             VALUES ($1, $2, 'pro', now(), now() + interval '30 days', 'stripe_simulated', 'sub_sim_test')`,
            [crypto.randomUUID(), userId],
          );
          const simSubRes = await fetch(api + "/api/payments/subscription", { headers: { cookie } });
          const simSub = await simSubRes.json();
          assert.equal(simSub.status, "none", "En producción, stripe_simulated no debe otorgar suscripción activa");
          await db.pool.query(
            `UPDATE subscriptions SET revoked_at = now() WHERE user_id = $1 AND provider = 'stripe_simulated'`,
            [userId],
          );
        }
      } finally {
        delete process.env.STRIPE_WEBHOOK_SECRET;
        await db.pool.end();
      }
    }
  }

  // 8. Probar Cupones Promocionales (POST /api/payments/coupons/validate y checkout con cupón)
  // 8.1 Cupón PRO50 (50% de descuento -> $149.50 MXN / 14950 centavos)
  const valPro50Res = await fetch(api + "/api/payments/coupons/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "pro50", planId: "pro" }),
  });
  assert.equal(valPro50Res.status, 200, "Valida cupón PRO50 con 200");
  const valPro50 = await valPro50Res.json();
  assert.equal(valPro50.valid, true);
  assert.equal(valPro50.code, "PRO50");
  assert.equal(valPro50.originalPriceCents, 29900);
  assert.equal(valPro50.discountCents, 14950);
  assert.equal(valPro50.finalPriceCents, 14950);

  // 8.2 Cupón AHORRA100 ($100 MXN / 10000 centavos de descuento -> 19900 centavos)
  const valAhorraRes = await fetch(api + "/api/payments/coupons/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "AHORRA100" }),
  });
  assert.equal(valAhorraRes.status, 200);
  const valAhorra = await valAhorraRes.json();
  assert.equal(valAhorra.discountCents, 10000);
  assert.equal(valAhorra.finalPriceCents, 19900);

  // 8.3 Cupón inexistente -> 404
  const notFoundCouponRes = await fetch(api + "/api/payments/coupons/validate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: "NOEXISTE99" }),
  });
  assert.equal(notFoundCouponRes.status, 404, "Cupón inexistente devuelve 404");

  // 8.4 Checkout con cupón PRO50 (con saldo a pagar > 0):
  // En producción sin STRIPE_SECRET_KEY también debe fallar con 503; en dev responde 200.
  const checkoutCouponRes = await fetch(api + "/api/payments/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie },
    body: JSON.stringify({ planId: "pro", couponCode: "PRO50" }),
  });
  if (isProduction && !hasStripeSecretKey) {
    assert.equal(checkoutCouponRes.status, 503);
  } else {
    assert.equal(checkoutCouponRes.status, 200);
    const checkoutCouponData = await checkoutCouponRes.json();
    assert.equal(checkoutCouponData.couponCode, "PRO50");
    assert.equal(checkoutCouponData.discountCents, 14950);
    assert.equal(checkoutCouponData.finalPriceCents, 14950);
  }

  // 8.5 Checkout con cupón de 100% de cortesía (PROGRATIS -> finalPriceCents = 0, no requiere cobro en Stripe)
  const freeCheckoutRes = await fetch(api + "/api/payments/checkout-session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie },
    body: JSON.stringify({ planId: "pro", couponCode: "PROGRATIS" }),
  });
  assert.equal(freeCheckoutRes.status, 200);
  const freeCheckoutData = await freeCheckoutRes.json();
  assert.equal(freeCheckoutData.finalPriceCents, 0);
  assert.equal(freeCheckoutData.couponCode, "PROGRATIS");

  const subAfterFreeRes = await fetch(api + "/api/payments/subscription", { headers: { cookie } });
  const subAfterFree = await subAfterFreeRes.json();
  assert.equal(subAfterFree.status, "active");
  assert.equal(subAfterFree.provider, "coupon_free");

  // 8.6 Cancelación directa desde el panel (POST /api/payments/cancel)
  const cancelDirectRes = await fetch(api + "/api/payments/cancel", {
    method: "POST",
    headers: { "content-type": "application/json", origin: site, "x-csrf": "1", cookie },
    body: JSON.stringify({}),
  });
  assert.equal(cancelDirectRes.status, 200, "Cancelación directa responde 200");
  const cancelDirectData = await cancelDirectRes.json();
  assert.equal(cancelDirectData.status, "canceled");

  console.log("PASS: Planes MXN, suscripciones, cupones de descuento, checkout session, webhooks HMAC, idempotencia y cancelación");
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
