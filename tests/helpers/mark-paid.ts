import type { APIRequestContext } from "@playwright/test";

/** Mark a bid paid through the Playwright mock Stripe webhook. */
export async function markBidPaid(
  request: APIRequestContext,
  input: { bidId: string; amountTotalCents: number; eventId?: string },
): Promise<void> {
  const eventId = input.eventId ?? `evt_${input.bidId}`;
  const res = await request.post("/api/stripe/webhook", {
    headers: { "x-bmb-stripe-mock": "playwright-cron-secret" },
    data: {
      id: eventId,
      type: "checkout.session.completed",
      data: {
        object: {
          id: `cs_mock_${input.bidId}`,
          payment_status: "paid",
          payment_intent: `pi_test_${input.bidId}`,
          amount_total: input.amountTotalCents,
          metadata: { bidId: input.bidId, kind: "deposit" },
        },
      },
    },
  });
  if (!res.ok()) {
    throw new Error(`markBidPaid ${res.status()}: ${await res.text()}`);
  }
}
