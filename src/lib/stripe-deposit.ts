/**
 * Stripe boundary. Mocked in Playwright when no secret key is set.
 * Production with LIVE_BIDDING off never reaches a charge.
 */

import Stripe from "stripe";

export type CheckoutKind = "deposit" | "remainder";

export type CheckoutRequest = {
  bidId: string;
  amountUsd: number;
  description: string;
  email: string;
  kind: CheckoutKind;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutSession = {
  id: string;
  url: string;
};

export function stripeMockEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.STRIPE_SECRET_KEY) return false;
  return env.AUTH_MODE === "test";
}

export function publishableKeyConfigured(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const key = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  return key.startsWith("pk_");
}

export function stripeConfigured(): boolean {
  if (stripeMockEnabled()) return true;
  return (
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    publishableKeyConfigured() &&
    Boolean(process.env.STRIPE_WEBHOOK_SECRET)
  );
}

function stripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  return new Stripe(key);
}

export async function createCheckoutSession(
  request: CheckoutRequest,
): Promise<CheckoutSession> {
  if (request.amountUsd <= 0) {
    throw new Error("Checkout amount must be a positive dollar amount.");
  }
  if (stripeMockEnabled()) {
    const id = `cs_mock_${request.kind}_${request.bidId}`;
    const url = new URL(request.successUrl);
    url.searchParams.set("session_id", id);
    return { id, url: url.toString() };
  }
  const stripe = stripeClient();
  const joiner = request.successUrl.includes("?") ? "&" : "?";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: request.email,
    client_reference_id: request.bidId,
    success_url: `${request.successUrl}${joiner}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: request.cancelUrl,
    metadata: {
      bidId: request.bidId,
      kind: request.kind,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: request.amountUsd * 100,
          product_data: { name: request.description },
        },
      },
    ],
  });
  if (!session.url) {
    throw new Error("Stripe Checkout did not return a URL.");
  }
  return { id: session.id, url: session.url };
}

export async function refundDepositPayment(
  paymentId: string,
  bidId: string,
): Promise<void> {
  if (!paymentId || paymentId.startsWith("credit_")) return;
  if (stripeMockEnabled()) return;
  const stripe = stripeClient();
  try {
    await stripe.refunds.create(
      { payment_intent: paymentId },
      { idempotencyKey: `bmb-refund-${bidId}` },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/already been refunded/i.test(message)) return;
    throw err;
  }
}

export function constructStripeEvent(
  rawBody: string,
  signature: string | null,
): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  }
  if (!signature) {
    throw new Error("Missing Stripe signature.");
  }
  return stripeClient().webhooks.constructEvent(rawBody, signature, secret);
}
