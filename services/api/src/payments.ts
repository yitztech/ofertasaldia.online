import {
  Controller,
  Get,
  Post,
  Req,
  HttpCode,
  HttpException,
  Injectable,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import { Database } from "./database.js";
import { AuthService, problem } from "./auth.js";
import { uuidv7 } from "./uuid.js";
import { z } from "zod";
import * as crypto from "node:crypto";

export interface PaymentPlan {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  interval: "month" | "year";
  popular?: boolean;
  features: string[];
}

export const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: "gratuito",
    name: "Plan Básico",
    description: "Ideal para creadores y afiliados que recién comienzan.",
    priceCents: 0,
    currency: "MXN",
    interval: "month",
    features: [
      "Hasta 10 productos recomendados",
      "Estadísticas básicas de clics",
      "Perfil público de afiliado",
      "Comisiones directas de tiendas",
    ],
  },
  {
    id: "pro",
    name: "Plan Creador Pro",
    description: "Para creadores de contenido y afiliados profesionales.",
    priceCents: 29900,
    currency: "MXN",
    interval: "month",
    popular: true,
    features: [
      "Productos y colecciones ilimitados",
      "Analítica y métricas en tiempo real",
      "Dominio y perfil personalizado",
      "Insignia de Afiliado Verificado",
      "Soporte prioritario 24/7",
    ],
  },
];

export function verifyStripeSignature(
  payload: Buffer | string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
): boolean {
  if (!signatureHeader || !secret) return false;
  const parts = signatureHeader.split(",");
  let timestamp = "";
  const signatures: string[] = [];
  for (const part of parts) {
    const [key, value] = part.trim().split("=");
    if (key === "t") timestamp = value;
    if (key === "v1") signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(ts) || Math.abs(now - ts) > toleranceSeconds) {
    return false;
  }

  const payloadString =
    typeof payload === "string" ? payload : payload.toString("utf8");
  const signedPayload = `${timestamp}.${payloadString}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  return signatures.some((sig) => {
    const sigBuf = Buffer.from(sig, "utf8");
    return (
      sigBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(sigBuf, expectedBuf)
    );
  });
}

const checkoutSchema = z.object({
  planId: z.literal("pro"),
});

@Injectable()
export class PaymentsService {
  constructor(private readonly db: Database) {}

  getPlans(): PaymentPlan[] {
    return PAYMENT_PLANS;
  }

  async getSubscription(userId: string) {
    const result = await this.db.pool.query(
      `SELECT
        id,
        plan_id AS "planId",
        starts_at AS "startsAt",
        expires_at AS "expiresAt",
        revoked_at AS "revokedAt",
        provider,
        provider_subscription_id AS "providerSubscriptionId"
      FROM subscriptions
      WHERE user_id = $1 AND starts_at <= now() AND expires_at > now() AND revoked_at IS NULL
      ORDER BY expires_at DESC
      LIMIT 1`,
      [userId],
    );

    const sub = result.rows[0];
    if (!sub) {
      return {
        status: "none",
        planId: "gratuito",
        startsAt: null,
        expiresAt: null,
        provider: null,
      };
    }

    return {
      status: "active",
      planId: sub.planId,
      startsAt: sub.startsAt,
      expiresAt: sub.expiresAt,
      provider: sub.provider,
    };
  }

  async createCheckoutSession(
    user: { id: string; name: string; email: string },
    planId: "pro",
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const isConfigured =
      Boolean(secretKey) &&
      !secretKey?.startsWith("mock") &&
      !secretKey?.startsWith("test");

    if (isConfigured && secretKey) {
      // 1. Obtener o registrar cliente de Stripe
      let customerId: string | undefined;
      const custCheck = await this.db.pool.query(
        "SELECT customer_id FROM payment_customers WHERE user_id = $1 AND provider = 'stripe'",
        [user.id],
      );
      if (custCheck.rows[0]) {
        customerId = custCheck.rows[0].customer_id;
      } else {
        const custRes = await fetch("https://api.stripe.com/v1/customers", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            email: user.email,
            name: user.name,
            "metadata[user_id]": user.id,
          }).toString(),
        });
        if (!custRes.ok) {
          problem(
            502,
            "payment_provider_error",
            "Error con el proveedor de pagos al crear cliente.",
          );
        }
        const custData = (await custRes.json()) as { id: string };
        customerId = custData.id;
        await this.db.pool.query(
          "INSERT INTO payment_customers(user_id, provider, customer_id) VALUES ($1, 'stripe', $2) ON CONFLICT (user_id) DO UPDATE SET customer_id=$2",
          [user.id, customerId],
        );
      }

      // 2. Crear sesión de Stripe Checkout
      const params = new URLSearchParams({
        mode: "subscription",
        customer: customerId!,
        client_reference_id: user.id,
        success_url: `${process.env.SITE_URL}/panel?pago=exitoso&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.SITE_URL}/planes?pago=cancelado`,
        "line_items[0][price_data][currency]": "mxn",
        "line_items[0][price_data][unit_amount]": "29900",
        "line_items[0][price_data][product_data][name]": "Plan Creador Pro",
        "line_items[0][price_data][recurring][interval]": "month",
        "line_items[0][quantity]": "1",
        "metadata[user_id]": user.id,
        "metadata[plan_id]": planId,
      });

      const sessionRes = await fetch(
        "https://api.stripe.com/v1/checkout/sessions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        },
      );

      if (!sessionRes.ok) {
        problem(
          502,
          "payment_provider_error",
          "No se pudo iniciar la sesión de pago con el proveedor.",
        );
      }
      const sessionData = (await sessionRes.json()) as {
        url: string;
        id: string;
      };
      return { url: sessionData.url, sessionId: sessionData.id };
    }

    // Modo simulación offline / CI (AGENTS §35)
    const sessionId = `cs_test_${uuidv7()}`;
    const url = `${process.env.SITE_URL || "http://localhost:8080"}/panel?pago=simulado&session_id=${sessionId}`;
    return { url, sessionId };
  }

  async handleWebhook(
    rawBody: Buffer | string,
    signatureHeader: string,
    eventPayload: any,
  ) {
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_local_secret";
    const isValid = verifyStripeSignature(
      rawBody,
      signatureHeader,
      webhookSecret,
    );
    if (!isValid) {
      problem(400, "invalid_signature", "Firma de webhook inválida.");
    }

    const event = eventPayload;
    if (!event || typeof event !== "object" || !event.id || !event.type) {
      problem(400, "invalid_payload", "Cuerpo de webhook malformado.");
    }

    const { id, type, data } = event;

    // Idempotencia: si el evento ya fue procesado, no repetir efectos (§21)
    const existing = await this.db.pool.query(
      "SELECT id FROM payment_events WHERE id = $1",
      [id],
    );
    if (existing.rows[0]) {
      return { received: true, duplicate: true };
    }

    const client = await this.db.pool.connect();
    try {
      await client.query("BEGIN");

      if (type === "checkout.session.completed") {
        const session = data?.object;
        let userId =
          session?.client_reference_id || session?.metadata?.user_id;
        const customerId = session?.customer;
        const subscriptionId = session?.subscription || `sub_sim_${uuidv7()}`;
        const planId = session?.metadata?.plan_id || "pro";

        if (!userId && customerId) {
          const userLookup = await client.query(
            "SELECT user_id FROM payment_customers WHERE customer_id = $1 AND provider = 'stripe'",
            [customerId],
          );
          if (userLookup.rows[0]) {
            userId = userLookup.rows[0].user_id;
          }
        }

        if (userId) {
          if (customerId) {
            await client.query(
              `INSERT INTO payment_customers (user_id, provider, customer_id)
               VALUES ($1, 'stripe', $2)
               ON CONFLICT (user_id) DO UPDATE SET customer_id = EXCLUDED.customer_id`,
              [userId, customerId],
            );
          }

          // Revocar suscripción previa
          await client.query(
            "UPDATE subscriptions SET revoked_at=now(), updated_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
            [userId],
          );

          // Crear nueva suscripción por 30 días
          await client.query(
            `INSERT INTO subscriptions (id, user_id, plan_id, provider, provider_subscription_id, starts_at, expires_at)
             VALUES ($1, $2, $3, 'stripe', $4, now(), now() + interval '30 days')`,
            [uuidv7(), userId, planId, subscriptionId],
          );
        }
      } else if (type === "customer.subscription.updated") {
        const sub = data?.object;
        const subId = sub?.id;
        const periodEnd = sub?.current_period_end
          ? new Date(sub.current_period_end * 1000)
          : null;
        if (subId && periodEnd) {
          await client.query(
            "UPDATE subscriptions SET expires_at = $1, updated_at = now() WHERE provider_subscription_id = $2 AND revoked_at IS NULL",
            [periodEnd, subId],
          );
        }
      } else if (type === "customer.subscription.deleted") {
        const sub = data?.object;
        const subId = sub?.id;
        if (subId) {
          await client.query(
            "UPDATE subscriptions SET revoked_at = now(), updated_at = now() WHERE provider_subscription_id = $1 AND revoked_at IS NULL",
            [subId],
          );
        }
      }

      await client.query(
        `INSERT INTO payment_events (id, provider, event_type, payload)
         VALUES ($1, 'stripe', $2, $3)`,
        [id, type, JSON.stringify(event)],
      );

      await client.query("COMMIT");
      return { received: true };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly auth: AuthService,
  ) {}

  @Get("api/payments/plans")
  getPlans() {
    return { plans: this.payments.getPlans() };
  }

  @Get("api/payments/subscription")
  async getSubscription(@Req() request: FastifyRequest) {
    const user = await this.auth.user(request);
    return this.payments.getSubscription(user.id);
  }

  @Post("api/payments/checkout-session")
  @HttpCode(200)
  async createCheckoutSession(@Req() request: FastifyRequest) {
    this.auth.csrf(request);
    const user = await this.auth.user(request);

    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      problem(422, "validation_failed", "Plan no válido.", [
        {
          field: "planId",
          code: "invalid_plan",
          message: "Selecciona un plan válido (pro).",
        },
      ]);
    }

    return this.payments.createCheckoutSession(user, parsed.data.planId);
  }

  @Post("api/public/v1/webhooks/payments")
  @HttpCode(200)
  async handleWebhook(@Req() request: FastifyRequest) {
    const signature = request.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      problem(400, "missing_signature", "Cabecera stripe-signature requerida.");
    }

    const raw =
      (request as any).rawBody ||
      Buffer.from(JSON.stringify(request.body || {}));

    return this.payments.handleWebhook(raw, signature, request.body);
  }
}
