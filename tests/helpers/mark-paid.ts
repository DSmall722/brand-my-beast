import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { depositUsdForMark } from "../../src/lib/intent";

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

/** Pay the signed-in user's newest account intent through the mock webhook. */
export async function markNewestAccountBidPaid(
  page: Page,
  request: APIRequestContext,
  standingUsd: number,
): Promise<string> {
  await page.goto("/account");
  const row = page.locator("[data-testid^='account-intent-']").first();
  await expect(row).toBeVisible();
  const bidId = (await row.getAttribute("data-testid"))!.replace(
    "account-intent-",
    "",
  );
  await markBidPaid(request, {
    bidId,
    amountTotalCents: depositUsdForMark(standingUsd) * 100,
  });
  return bidId;
}
