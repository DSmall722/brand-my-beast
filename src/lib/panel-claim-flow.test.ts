import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GOAL_USD, PANELS } from "./campaign";
import {
  resetCampaignClockForTests,
  setCampaignClockForTests,
} from "./campaign-clock";
import { effectiveCloseMs, lockedCloseAt } from "./campaign-window";
import { applyStripeEvent, placeDepositBid } from "./deposit-flow";
import {
  getIntentBidById,
  listAllIntentBids,
  resetIntentStoreForTests,
  resetStripeEventsForTests,
} from "./intent-store";
import { closeTier, committedTotalUsd } from "./panel-claim";
import {
  applyBuyoutRelease,
  loadCampaignClaimState,
  loadPanelClaimState,
  placePanelClaim,
  rejectClaimBrandCheck,
  resetPanelClaimStoreForTests,
} from "./panel-claim-flow";

const OPEN = "2026-10-07T16:00:00.000Z";
const LAST_TEN = "2026-12-31T16:55:00.000Z";
const ORIGIN = "http://127.0.0.1:8101";

function claimInput(panelId: string, brand: string, key?: string) {
  return {
    panelId,
    brandLabel: brand,
    tradeLabel: `${brand} trade`,
    email: `${brand.replace(/\s+/g, "-").toLowerCase()}@example.com`,
    origin: ORIGIN,
    idempotencyKey: key ?? null,
  };
}

async function payCheckout(intentId: string, eventId: string) {
  const bid = await getIntentBidById(intentId);
  if (!bid) throw new Error("missing intent");
  return applyStripeEvent({
    id: eventId,
    type: "checkout.session.completed",
    data: {
      object: {
        id: bid.checkoutSessionId ?? `cs_${intentId}`,
        client_reference_id: intentId,
        payment_status: "paid",
        payment_intent: `pi_${eventId}`,
        amount_total: bid.depositUsd * 100,
        metadata: {
          bidId: intentId,
          kind: bid.kind === "claim" ? "claim" : "deposit",
        },
      },
    },
  });
}

async function claimPanel(panelId: string, brand: string) {
  const placed = await placePanelClaim(claimInput(panelId, brand));
  if (!placed.ok) throw new Error(placed.error);
  const paid = await payCheckout(placed.bidId, `evt_${placed.bidId}`);
  if (!paid.ok) throw new Error(paid.error);
  return placed.bidId;
}

describe("bmb-panel-claim-price flow", () => {
  beforeEach(async () => {
    process.env.AUTH_MODE = "test";
    process.env.INTENT_MODE = "memory";
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.LIVE_BIDDING;
    await resetIntentStoreForTests();
    resetStripeEventsForTests();
    resetPanelClaimStoreForTests();
    resetCampaignClockForTests();
    setCampaignClockForTests({ live: true, now: OPEN });
  });

  afterEach(() => {
    resetCampaignClockForTests();
  });

  it("marks a paid claim, outbids a lower bid, and refunds that bid", async () => {
    const bid = await placeDepositBid({
      panelId: "hood",
      standingUsd: 2500,
      brandLabel: "Low Bid Co",
      tradeLabel: "tools",
      email: "low@example.com",
      origin: ORIGIN,
    });
    expect(bid.ok).toBe(true);
    if (!bid.ok) return;
    await payCheckout(bid.bidId, "evt_low");
    const claimId = await claimPanel("hood", "Claim Co");
    const claim = await getIntentBidById(claimId);
    const lower = await getIntentBidById(bid.bidId);
    const panel = await loadPanelClaimState("hood");
    expect(claim?.kind).toBe("claim");
    expect(claim?.status).toBe("approved");
    expect(claim?.standingUsd).toBe(13_000);
    expect(lower?.status).toBe("outbid");
    expect(lower?.refundStatus).toBe("refunded");
    expect(panel.claimStatus).toBe("claimed");
    expect(panel.claimedIntentId).toBe(claimId);
  });

  it("refunds a claim that arrives after a bid at the claim price", async () => {
    const bid = await placeDepositBid({
      panelId: "hood",
      standingUsd: 13_000,
      brandLabel: "High Bid Co",
      tradeLabel: "tools",
      email: "high@example.com",
      origin: ORIGIN,
    });
    expect(bid.ok).toBe(true);
    if (!bid.ok) return;
    await payCheckout(bid.bidId, "evt_high");
    const placed = await placePanelClaim(claimInput("hood", "Late Claim"));
    expect(placed.ok).toBe(false);
    const panel = await loadPanelClaimState("hood");
    expect(panel.claimStatus).toBe("withdrawn");
    const standing = await getIntentBidById(bid.bidId);
    expect(standing?.status).toBe("listed");
    expect(standing?.refundStatus).toBe("none");
  });

  it("lets only one of two concurrent claims win and refunds the other", async () => {
    const first = await placePanelClaim(claimInput("hood", "First Claim", "k1"));
    const second = await placePanelClaim(
      claimInput("hood", "Second Claim", "k2"),
    );
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    await payCheckout(first.bidId, "evt_first");
    await payCheckout(second.bidId, "evt_second");
    const a = await getIntentBidById(first.bidId);
    const b = await getIntentBidById(second.bidId);
    const winners = [a, b].filter(
      (row) => row?.refundStatus === "none" && row.status === "approved",
    );
    const refunded = [a, b].filter((row) => row?.refundStatus === "refunded");
    expect(winners).toHaveLength(1);
    expect(refunded).toHaveLength(1);
    const panel = await loadPanelClaimState("hood");
    expect(panel.claimStatus).toBe("claimed");
    expect(panel.claimedIntentId).toBe(winners[0]?.id);
  });

  it("closes the board on the 11th paid claim and expires open sessions", async () => {
    const open = await placeDepositBid({
      panelId: "rear-bumper",
      standingUsd: 500,
      brandLabel: "Open Bid",
      tradeLabel: "signs",
      email: "open@example.com",
      origin: ORIGIN,
    });
    expect(open.ok).toBe(true);
    if (!open.ok) return;
    for (const panel of PANELS) {
      await claimPanel(panel.id, `Brand ${panel.id}`);
    }
    const state = await loadCampaignClaimState();
    expect(state.committedTotalUsd).toBe(GOAL_USD);
    expect(state.tierLocked).toBe("purchase");
    expect(state.boardClosedReason).toBe("all_claimed");
    const unpaid = await getIntentBidById(open.bidId);
    expect(unpaid?.refundStatus).toBe("refunded");
    const late = await placeDepositBid({
      panelId: "hood",
      standingUsd: 14_000,
      brandLabel: "Late Bid",
      tradeLabel: "late",
      email: "late@example.com",
      origin: ORIGIN,
    });
    expect(late.ok).toBe(false);
  });

  it("locks purchase when 10 claims plus a bid on the 11th reach $120,000", async () => {
    const open = PANELS[PANELS.length - 1];
    for (const panel of PANELS.slice(0, 10)) {
      await claimPanel(panel.id, `Brand ${panel.id}`);
    }
    const bid = await placeDepositBid({
      panelId: open.id,
      standingUsd: open.claimPriceUsd,
      brandLabel: "Closer",
      tradeLabel: "closer",
      email: "closer@example.com",
      origin: ORIGIN,
    });
    expect(bid.ok).toBe(true);
    if (!bid.ok) return;
    await payCheckout(bid.bidId, "evt_closer");
    const state = await loadCampaignClaimState();
    expect(state.committedTotalUsd).toBeGreaterThanOrEqual(GOAL_USD);
    expect(state.tierLocked).toBe("purchase");
    expect(state.boardClosedReason).toBeNull();
    const still = await placeDepositBid({
      panelId: open.id,
      standingUsd: open.claimPriceUsd + 500,
      brandLabel: "Keep Bidding",
      tradeLabel: "keep",
      email: "keep@example.com",
      origin: ORIGIN,
    });
    expect(still.ok).toBe(true);
  });

  it("lifts the purchase lock when a brand-check failure drops the total", async () => {
    const open = PANELS[PANELS.length - 1];
    const claimIds: string[] = [];
    for (const panel of PANELS.slice(0, 10)) {
      claimIds.push(await claimPanel(panel.id, `Brand ${panel.id}`));
    }
    const bid = await placeDepositBid({
      panelId: open.id,
      standingUsd: open.claimPriceUsd,
      brandLabel: "Closer",
      tradeLabel: "closer",
      email: "closer@example.com",
      origin: ORIGIN,
    });
    if (!bid.ok) return;
    await payCheckout(bid.bidId, "evt_lock");
    expect((await loadCampaignClaimState()).tierLocked).toBe("purchase");
    await rejectClaimBrandCheck(claimIds[0]!);
    const state = await loadCampaignClaimState();
    expect(state.committedTotalUsd).toBeLessThan(GOAL_USD);
    expect(state.tierLocked).toBe("none");
    expect(state.purchaseTriggeredAt).toBeNull();
    const panel = await loadPanelClaimState(PANELS[0]!.id);
    expect(panel.claimStatus).toBe("available");
  });

  it("buyout before the trigger refunds claims and bids", async () => {
    const claimId = await claimPanel("hood", "Claim Co");
    const bid = await placeDepositBid({
      panelId: "tailgate",
      standingUsd: 2500,
      brandLabel: "Bid Co",
      tradeLabel: "bid",
      email: "bid@example.com",
      origin: ORIGIN,
    });
    if (!bid.ok) return;
    await payCheckout(bid.bidId, "evt_bid");
    const result = await applyBuyoutRelease();
    expect(result.ok).toBe(true);
    expect((await getIntentBidById(claimId))?.refundStatus).toBe("refunded");
    expect((await getIntentBidById(bid.bidId))?.refundStatus).toBe("refunded");
    expect((await loadPanelClaimState("hood")).claimStatus).toBe("available");
    expect((await loadCampaignClaimState()).boardClosedReason).toBe("buyout");
  });

  it("close at $85,000 is wrap; close at $20,000 refunds all", async () => {
    const wrap = committedTotalUsd(
      mixClose({
        claimed: PANELS.filter(
          (panel) => panel.id !== "driver-door" && panel.id !== "passenger-door",
        ).map((panel) => panel.id),
        bids: { "driver-door": 4_500, "passenger-door": 4_500 },
      }),
    );
    expect(wrap).toBe(85_000);
    expect(closeTier(wrap)).toBe("wrap");
    const miss = committedTotalUsd(
      mixClose({
        claimed: [
          "front-bumper",
          "rear-bumper",
          "driver-rear-quarter",
          "passenger-rear-quarter",
        ],
      }),
    );
    expect(miss).toBe(20_000);
    expect(closeTier(miss)).toBe("refund");
  });

  it("a claim in the last 10 minutes does not move CLOSE_AT", async () => {
    setCampaignClockForTests({ live: true, now: LAST_TEN });
    await claimPanel("hood", "Late Claim");
    const bids = await listAllIntentBids();
    const bidTimes = bids
      .filter((bid) => bid.kind !== "claim")
      .map((bid) => bid.createdAt);
    const closeMs = effectiveCloseMs(lockedCloseAt(), bidTimes);
    expect(closeMs).toBe(Date.parse(lockedCloseAt()));
  });

  it("idempotency replay does not double charge", async () => {
    const first = await placePanelClaim(
      claimInput("hood", "Same Brand", "same-key"),
    );
    const replay = await placePanelClaim(
      claimInput("hood", "Same Brand", "same-key"),
    );
    expect(first.ok && replay.ok).toBe(true);
    if (!first.ok || !replay.ok) return;
    expect(replay.bidId).toBe(first.bidId);
    await payCheckout(first.bidId, "evt_once");
    await payCheckout(first.bidId, "evt_once");
    const all = (await listAllIntentBids()).filter(
      (bid) => bid.kind === "claim" && bid.panelId === "hood",
    );
    expect(all).toHaveLength(1);
    expect(all[0]?.depositPaidAt).toBeTruthy();
  });

  it("LIVE_BIDDING off records intent only and does not call Stripe", async () => {
    setCampaignClockForTests({ live: false, now: OPEN });
    const placed = await placePanelClaim(claimInput("hood", "Intent Only"));
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.checkoutUrl).toBeNull();
    const bid = await getIntentBidById(placed.bidId);
    expect(bid?.kind).toBe("claim");
    expect(bid?.checkoutSessionId).toBeNull();
    expect(bid?.depositPaidAt).toBeNull();
    expect((await loadPanelClaimState("hood")).claimStatus).toBe("available");
  });
});

function mixClose(input: {
  claimed?: readonly string[];
  bids?: Readonly<Record<string, number>>;
}) {
  const claimedSet = new Set(input.claimed ?? []);
  const bids = input.bids ?? {};
  return PANELS.map((panel) => ({
    panelId: panel.id,
    claimStatus: (claimedSet.has(panel.id) ? "claimed" : "available") as
      | "claimed"
      | "available",
    claimPriceUsd: panel.claimPriceUsd,
    highestPaidBidUsd: claimedSet.has(panel.id)
      ? null
      : (bids[panel.id] ?? null),
  }));
}
