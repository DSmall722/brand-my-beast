import { NextResponse } from "next/server";
import {
  applyStripeEvent,
  settleClosedCampaign,
  type StripeEventInput,
} from "@/lib/deposit-flow";
import {
  constructStripeEvent,
  stripeMockEnabled,
} from "@/lib/stripe-deposit";

export const runtime = "nodejs";

function mockAuthorized(request: Request): boolean {
  if (!stripeMockEnabled()) return false;
  const token = request.headers.get("x-bmb-stripe-mock");
  const expected = process.env.CRON_SECRET ?? "";
  return expected.length > 0 && token === expected;
}

/**
 * Stripe webhook. Signature is required unless the Playwright mock header
 * matches CRON_SECRET. Event ids are stored so retries do not double-apply.
 *
 * Enable checkout.session.completed, checkout.session.async_payment_succeeded,
 * and checkout.session.expired.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  let event: StripeEventInput;
  try {
    if (mockAuthorized(request)) {
      event = JSON.parse(raw) as StripeEventInput;
    } else {
      const verified = constructStripeEvent(
        raw,
        request.headers.get("stripe-signature"),
      );
      event = {
        id: verified.id,
        type: verified.type,
        data: { object: verified.data.object as StripeEventInput["data"]["object"] },
      };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid webhook.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  const result = await applyStripeEvent(event);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }
  if (!result.duplicate) {
    await settleClosedCampaign();
  }
  return NextResponse.json({ ok: true, duplicate: result.duplicate });
}
