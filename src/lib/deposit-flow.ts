/**
 * Place a deposit bid, apply a verified Stripe event, and settle after close.
 * Stripe stays behind stripe-deposit.ts. This module owns the ledger writes.
 */

import { PANELS } from "./campaign";
import { depositDeskOpen, resolveNowMs } from "./campaign-clock";
import {
  depositDueUsd,
  effectiveCloseMs,
  lockedCloseAt,
  planSettlement,
  priorCapturedCreditUsd,
  remainderUsd,
  type SettleAction,
} from "./campaign-window";
import { assertTradeAllowed } from "./banned-trades";
import {
  depositUsdForMark,
  hasPaidDeposit,
  nextStandingUsd,
  type IntentBid,
} from "./intent";
import {
  claimStripeEvent,
  findBidByCheckoutSession,
  getIntentBidById,
  insertDepositBid,
  listAllIntentBids,
  patchDepositBid,
  stripeEventSeen,
} from "./intent-store";
import {
  createCheckoutSession,
  refundDepositPayment,
  stripeConfigured,
  type CheckoutKind,
} from "./stripe-deposit";

export type DepositBidInput = {
  panelId: string;
  standingUsd: number;
  brandLabel: string;
  tradeLabel: string;
  email: string;
  idempotencyKey?: string | null;
  origin: string;
};

export type DepositBidResult =
  | {
      ok: true;
      bidId: string;
      depositDueUsd: number;
      checkoutUrl: string | null;
      covered: boolean;
    }
  | { ok: false; error: string; code: string; status: number };

function panelById(panelId: string) {
  return PANELS.find((panel) => panel.id === panelId);
}

function paidLeaderUsd(bids: readonly IntentBid[], panelId: string): number | null {
  const paid = bids.filter(
    (bid) =>
      bid.panelId === panelId &&
      (bid.status === "listed" || bid.status === "approved") &&
      hasPaidDeposit(bid) &&
      (bid.refundStatus ?? "none") === "none" &&
      bid.floorSaveUsd == null,
  );
  if (paid.length === 0) return null;
  return Math.max(...paid.map((bid) => bid.standingUsd));
}

function userIdForEmail(email: string): string {
  return `deposit:${email.trim().toLowerCase()}`;
}

export function depositEmailFromUserId(userId: string): string | null {
  if (!userId.startsWith("deposit:")) return null;
  return userId.slice("deposit:".length);
}

export async function placeDepositBid(
  input: DepositBidInput,
): Promise<DepositBidResult> {
  const bids = await listAllIntentBids();
  const times = bids.map((bid) => bid.createdAt);
  if (!depositDeskOpen(times)) {
    return {
      ok: false,
      status: 403,
      code: "bidding_closed",
      error: "Bidding is not open.",
    };
  }
  if (!stripeConfigured()) {
    return {
      ok: false,
      status: 503,
      code: "stripe_not_configured",
      error: "Deposit checkout is not configured.",
    };
  }
  const panel = panelById(input.panelId);
  if (!panel) {
    return {
      ok: false,
      status: 400,
      code: "bad_panel",
      error: "Unknown panel.",
    };
  }
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      status: 400,
      code: "bad_email",
      error: "Email is required.",
    };
  }
  const brandLabel = input.brandLabel.trim();
  const tradeLabel = input.tradeLabel.trim();
  if (brandLabel.length < 2 || tradeLabel.length < 2) {
    return {
      ok: false,
      status: 400,
      code: "bad_brand",
      error: "Brand and trade are required.",
    };
  }
  const allowed = assertTradeAllowed({ brandLabel, tradeLabel });
  if (!allowed.ok) {
    return {
      ok: false,
      status: 400,
      code: "banned_trade",
      error: allowed.error,
    };
  }
  if (!Number.isInteger(input.standingUsd) || input.standingUsd <= 0) {
    return {
      ok: false,
      status: 400,
      code: "bad_amount",
      error: "Bid must be a whole dollar amount.",
    };
  }
  const leader = paidLeaderUsd(bids, panel.id);
  const minimum = leader == null ? panel.openingUsd : nextStandingUsd(leader);
  if (input.standingUsd < minimum) {
    return {
      ok: false,
      status: 400,
      code: "below_minimum",
      error: `Bid must be at least ${minimum}.`,
    };
  }
  const userId = userIdForEmail(email);
  const obligation = depositUsdForMark(input.standingUsd);
  const credit = priorCapturedCreditUsd(bids, userId, panel.id);
  const due = depositDueUsd(obligation, credit);
  const idempotencyKey = input.idempotencyKey?.trim() || null;
  if (due === 0) {
    const bid = await insertDepositBid({
      panelId: panel.id,
      userId,
      brandLabel,
      tradeLabel,
      standingUsd: input.standingUsd,
      depositUsd: obligation,
      creditUsd: credit,
      idempotencyKey,
      checkoutSessionId: null,
      depositPaidAt: new Date(resolveNowMs()).toISOString(),
      capturedUsd: 0,
      paymentId: null,
    });
    await demoteLowerPaidBids(bid);
    return {
      ok: true,
      bidId: bid.id,
      depositDueUsd: 0,
      checkoutUrl: null,
      covered: true,
    };
  }
  const pending = await insertDepositBid({
    panelId: panel.id,
    userId,
    brandLabel,
    tradeLabel,
    standingUsd: input.standingUsd,
    depositUsd: obligation,
    creditUsd: credit,
    idempotencyKey,
    checkoutSessionId: null,
    depositPaidAt: null,
    capturedUsd: 0,
    paymentId: null,
  });
  const session = await createCheckoutSession({
    bidId: pending.id,
    amountUsd: due,
    description: `BrandMyBeast deposit for ${panel.name}`,
    email,
    kind: "deposit",
    successUrl: `${input.origin}/bid/return?bid=${pending.id}`,
    cancelUrl: `${input.origin}/panels/${panel.id}`,
  });
  await patchDepositBid(pending.id, { checkoutSessionId: session.id });
  return {
    ok: true,
    bidId: pending.id,
    depositDueUsd: due,
    checkoutUrl: session.url,
    covered: false,
  };
}

async function demoteLowerPaidBids(winner: IntentBid): Promise<void> {
  const bids = await listAllIntentBids();
  for (const other of bids) {
    if (other.id === winner.id || other.panelId !== winner.panelId) continue;
    if (!hasPaidDeposit(other)) continue;
    if ((other.refundStatus ?? "none") !== "none") continue;
    if (other.status !== "listed" && other.status !== "approved") continue;
    const lower = other.standingUsd < winner.standingUsd;
    const tieLost =
      other.standingUsd === winner.standingUsd &&
      other.createdAt > winner.createdAt;
    if (lower || tieLost) {
      await patchDepositBid(other.id, { status: "outbid" });
    }
  }
}

type CheckoutObject = {
  id?: string;
  client_reference_id?: string | null;
  payment_status?: string;
  payment_intent?: string | { id?: string } | null;
  amount_total?: number | null;
  metadata?: { bidId?: string; kind?: string } | null;
};

export type StripeEventInput = {
  id: string;
  type: string;
  data: { object?: CheckoutObject };
};

export async function applyStripeEvent(
  event: StripeEventInput,
): Promise<{ ok: true; duplicate: boolean } | { ok: false; error: string }> {
  if (!event.id || !event.type) {
    return { ok: false, error: "Stripe event id and type are required." };
  }
  if (await stripeEventSeen(event.id)) return { ok: true, duplicate: true };
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const applied = await applyCheckoutSession(event.data.object);
    if (!applied.ok) return applied;
  }
  await claimStripeEvent(event.id, event.type);
  return { ok: true, duplicate: false };
}

async function applyCheckoutSession(
  session: CheckoutObject | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!session) return { ok: false, error: "Missing checkout session." };
  const bidId = session.metadata?.bidId || session.client_reference_id || "";
  if (!bidId) return { ok: false, error: "Checkout session has no bid id." };
  const bid = await getIntentBidById(bidId);
  if (!bid) return { ok: false, error: "Bid was not found." };
  const kind: CheckoutKind =
    session.metadata?.kind === "remainder" ? "remainder" : "deposit";
  if (session.payment_status && session.payment_status !== "paid") {
    return { ok: true };
  }
  const paymentIntent = session.payment_intent;
  const paymentId =
    typeof paymentIntent === "string"
      ? paymentIntent
      : paymentIntent?.id ?? null;
  const capturedUsd =
    typeof session.amount_total === "number"
      ? Math.round(session.amount_total / 100)
      : (bid.depositUsd - (bid.creditUsd ?? 0));
  const paidAt = new Date(resolveNowMs()).toISOString();
  if (kind === "remainder") {
    if (!bid.remainderPaidAt) {
      await patchDepositBid(bid.id, { remainderPaidAt: paidAt });
    }
    return { ok: true };
  }
  if (hasPaidDeposit(bid)) return { ok: true };
  const updated = await patchDepositBid(bid.id, {
    depositPaidAt: paidAt,
    paymentId,
    capturedUsd: Math.max(0, capturedUsd),
    checkoutSessionId: session.id ?? bid.checkoutSessionId ?? null,
  });
  if (updated) await demoteLowerPaidBids(updated);
  return { ok: true };
}

export async function settleClosedCampaign(
  nowMs: number = resolveNowMs(),
): Promise<{ actions: SettleAction[] }> {
  const bids = await listAllIntentBids();
  const closeMs = effectiveCloseMs(
    lockedCloseAt(),
    bids.map((bid) => bid.createdAt),
  );
  const actions = planSettlement(bids, nowMs, closeMs);
  for (const action of actions) {
    if (action.kind === "refund") {
      if (action.paymentId) {
        await refundDepositPayment(action.paymentId, action.bidId);
      }
      await patchDepositBid(action.bidId, {
        refundStatus: "refunded",
        status: "outbid",
      });
    } else if (action.kind === "forfeit") {
      await patchDepositBid(action.bidId, {
        refundStatus: "forfeited",
        status: "rejected",
      });
    } else {
      await patchDepositBid(action.bidId, {
        invoiceCreditedAt: new Date(nowMs).toISOString(),
        remainderDueAt: action.remainderDueAt,
      });
    }
  }
  return { actions };
}

export async function placeRemainderCheckout(input: {
  bidId: string;
  email: string;
  origin: string;
}): Promise<DepositBidResult> {
  const bids = await listAllIntentBids();
  const closeMs = effectiveCloseMs(
    lockedCloseAt(),
    bids.map((bid) => bid.createdAt),
  );
  if (resolveNowMs() < closeMs) {
    return {
      ok: false,
      status: 403,
      code: "bidding_open",
      error: "The remainder is due after the board closes.",
    };
  }
  const bid = await getIntentBidById(input.bidId);
  if (!bid || !hasPaidDeposit(bid)) {
    return { ok: false, status: 404, code: "missing", error: "Bid was not found." };
  }
  if (bid.userId !== userIdForEmail(input.email)) {
    return { ok: false, status: 403, code: "not_bidder", error: "Email does not match this bid." };
  }
  if (bid.remainderPaidAt) {
    return {
      ok: true,
      bidId: bid.id,
      depositDueUsd: 0,
      checkoutUrl: null,
      covered: true,
    };
  }
  const captured = priorCapturedCreditUsd(bids, bid.userId, bid.panelId);
  const due = remainderUsd(bid.standingUsd, captured);
  if (due === 0) {
    await patchDepositBid(bid.id, {
      remainderPaidAt: new Date(resolveNowMs()).toISOString(),
    });
    return {
      ok: true,
      bidId: bid.id,
      depositDueUsd: 0,
      checkoutUrl: null,
      covered: true,
    };
  }
  if (!stripeConfigured()) {
    return {
      ok: false,
      status: 503,
      code: "stripe_not_configured",
      error: "Deposit checkout is not configured.",
    };
  }
  const panel = panelById(bid.panelId);
  const session = await createCheckoutSession({
    bidId: bid.id,
    amountUsd: due,
    description: `BrandMyBeast remainder for ${panel?.name ?? bid.panelId}`,
    email: input.email.trim().toLowerCase(),
    kind: "remainder",
    successUrl: `${input.origin}/bid/return?bid=${bid.id}`,
    cancelUrl: `${input.origin}/panels/${bid.panelId}`,
  });
  if (!bid.checkoutSessionId) {
    await patchDepositBid(bid.id, { checkoutSessionId: session.id });
  }
  return {
    ok: true,
    bidId: bid.id,
    depositDueUsd: due,
    checkoutUrl: session.url,
    covered: false,
  };
}

export async function bidForCheckoutSession(sessionId: string) {
  return findBidByCheckoutSession(sessionId);
}

/** After the effective close, apply refunds and invoice credits. No-op before close. */
export async function settleIfCampaignClosed(): Promise<void> {
  const bids = await listAllIntentBids();
  const closeMs = effectiveCloseMs(
    lockedCloseAt(),
    bids.map((bid) => bid.createdAt),
  );
  if (resolveNowMs() < closeMs) return;
  await settleClosedCampaign();
}
