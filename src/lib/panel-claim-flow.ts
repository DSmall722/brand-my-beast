import { eq } from "drizzle-orm";
import { PANELS } from "./campaign";
import {
  depositDeskOpen,
  resolveLiveBidding,
  resolveNowMs,
} from "./campaign-clock";
import { assertTradeAllowed } from "./banned-trades";
import { getDb } from "./db";
import {
  campaignClaimEvents,
  campaignClaimState,
  panelClaimState,
} from "./db/schema";
import {
  countsAsPublicStanding,
  hasPaidDeposit,
  type IntentBid,
} from "./intent";
import {
  getIntentBidById,
  insertDepositBid,
  listAllIntentBids,
  patchDepositBid,
} from "./intent-store";
import { panelBoardMarkFor } from "./panel-board";
import {
  buyoutAvailable,
  claimDepositUsd,
  claimable,
  closeTier,
  committedTotalUsd,
  purchaseTrigger,
  type BoardClosedReason,
  type ClaimStatus,
  type CommittedPanelInput,
  type TierLocked,
} from "./panel-claim";
import {
  createCheckoutSession,
  expireCheckoutSession,
  refundDepositPayment,
  stripeConfigured,
} from "./stripe-deposit";

export type PanelClaimRow = {
  panelId: string;
  claimPriceUsd: number;
  claimStatus: ClaimStatus;
  claimedIntentId: string | null;
  claimedAt: string | null;
};

export type CampaignClaimRow = {
  committedTotalUsd: number;
  tierLocked: TierLocked;
  purchaseTriggeredAt: string | null;
  boardClosedReason: BoardClosedReason | null;
};

export type ClaimEventName =
  | "claim"
  | "claim_withdrawn"
  | "claim_released"
  | "purchase_triggered"
  | "purchase_unlocked"
  | "refund";

export type PlaceClaimResult =
  | {
      ok: true;
      bidId: string;
      depositDueUsd: number;
      checkoutUrl: string | null;
      covered: boolean;
    }
  | { ok: false; error: string; code: string; status: number };

type MemorySlot = {
  panels: Map<string, PanelClaimRow>;
  campaign: CampaignClaimRow;
  events: Array<{
    id: string;
    event: ClaimEventName;
    panelId: string | null;
    intentId: string | null;
    createdAt: string;
  }>;
};

const globalClaim = globalThis as typeof globalThis & {
  __bmbPanelClaim?: MemorySlot;
};

function emptyCampaign(): CampaignClaimRow {
  return {
    committedTotalUsd: 0,
    tierLocked: "none",
    purchaseTriggeredAt: null,
    boardClosedReason: null,
  };
}

function seedPanels(): Map<string, PanelClaimRow> {
  const map = new Map<string, PanelClaimRow>();
  for (const panel of PANELS) {
    map.set(panel.id, {
      panelId: panel.id,
      claimPriceUsd: panel.claimPriceUsd,
      claimStatus: "available",
      claimedIntentId: null,
      claimedAt: null,
    });
  }
  return map;
}

function memorySlot(): MemorySlot {
  if (!globalClaim.__bmbPanelClaim) {
    globalClaim.__bmbPanelClaim = {
      panels: seedPanels(),
      campaign: emptyCampaign(),
      events: [],
    };
  }
  return globalClaim.__bmbPanelClaim;
}

function claimStoreUsesMemory(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

function parseClaimStatus(raw: string | null | undefined): ClaimStatus {
  if (raw === "withdrawn" || raw === "claimed") return raw;
  return "available";
}

function parseTierLocked(raw: string | null | undefined): TierLocked {
  return raw === "purchase" ? "purchase" : "none";
}

function parseClosedReason(
  raw: string | null | undefined,
): BoardClosedReason | null {
  if (raw === "close_at" || raw === "buyout" || raw === "all_claimed") return raw;
  return null;
}

export function resetPanelClaimStoreForTests(): void {
  globalClaim.__bmbPanelClaim = {
    panels: seedPanels(),
    campaign: emptyCampaign(),
    events: [],
  };
}

export async function loadPanelClaimState(panelId: string): Promise<PanelClaimRow> {
  const panel = PANELS.find((row) => row.id === panelId);
  if (!panel) {
    throw new Error(`Unknown panel: ${panelId}`);
  }
  if (claimStoreUsesMemory()) {
    const row = memorySlot().panels.get(panelId);
    if (row) return { ...row };
    const seeded = {
      panelId,
      claimPriceUsd: panel.claimPriceUsd,
      claimStatus: "available" as const,
      claimedIntentId: null,
      claimedAt: null,
    };
    memorySlot().panels.set(panelId, seeded);
    return { ...seeded };
  }
  const db = getDb();
  if (!db) {
    return {
      panelId,
      claimPriceUsd: panel.claimPriceUsd,
      claimStatus: "available",
      claimedIntentId: null,
      claimedAt: null,
    };
  }
  const rows = await db
    .select()
    .from(panelClaimState)
    .where(eq(panelClaimState.panelId, panelId))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return {
      panelId,
      claimPriceUsd: panel.claimPriceUsd,
      claimStatus: "available",
      claimedIntentId: null,
      claimedAt: null,
    };
  }
  return {
    panelId: row.panelId,
    claimPriceUsd: row.claimPriceUsd,
    claimStatus: parseClaimStatus(row.claimStatus),
    claimedIntentId: row.claimedIntentId ?? null,
    claimedAt: row.claimedAt ? row.claimedAt.toISOString() : null,
  };
}

export async function loadCampaignClaimState(): Promise<CampaignClaimRow> {
  if (claimStoreUsesMemory()) {
    return { ...memorySlot().campaign };
  }
  const db = getDb();
  if (!db) return emptyCampaign();
  const rows = await db
    .select()
    .from(campaignClaimState)
    .where(eq(campaignClaimState.id, "default"))
    .limit(1);
  const row = rows[0];
  if (!row) return emptyCampaign();
  return {
    committedTotalUsd: row.committedTotalUsd,
    tierLocked: parseTierLocked(row.tierLocked),
    purchaseTriggeredAt: row.purchaseTriggeredAt
      ? row.purchaseTriggeredAt.toISOString()
      : null,
    boardClosedReason: parseClosedReason(row.boardClosedReason),
  };
}

async function writePanel(row: PanelClaimRow): Promise<void> {
  if (claimStoreUsesMemory()) {
    memorySlot().panels.set(row.panelId, { ...row });
    return;
  }
  const db = getDb();
  if (!db) return;
  await db
    .insert(panelClaimState)
    .values({
      panelId: row.panelId,
      claimPriceUsd: row.claimPriceUsd,
      claimStatus: row.claimStatus,
      claimedIntentId: row.claimedIntentId,
      claimedAt: row.claimedAt ? new Date(row.claimedAt) : null,
    })
    .onConflictDoUpdate({
      target: panelClaimState.panelId,
      set: {
        claimPriceUsd: row.claimPriceUsd,
        claimStatus: row.claimStatus,
        claimedIntentId: row.claimedIntentId,
        claimedAt: row.claimedAt ? new Date(row.claimedAt) : null,
      },
    });
}

async function writeCampaign(row: CampaignClaimRow): Promise<void> {
  if (claimStoreUsesMemory()) {
    memorySlot().campaign = { ...row };
    return;
  }
  const db = getDb();
  if (!db) return;
  await db
    .insert(campaignClaimState)
    .values({
      id: "default",
      committedTotalUsd: row.committedTotalUsd,
      tierLocked: row.tierLocked,
      purchaseTriggeredAt: row.purchaseTriggeredAt
        ? new Date(row.purchaseTriggeredAt)
        : null,
      boardClosedReason: row.boardClosedReason,
    })
    .onConflictDoUpdate({
      target: campaignClaimState.id,
      set: {
        committedTotalUsd: row.committedTotalUsd,
        tierLocked: row.tierLocked,
        purchaseTriggeredAt: row.purchaseTriggeredAt
          ? new Date(row.purchaseTriggeredAt)
          : null,
        boardClosedReason: row.boardClosedReason,
      },
    });
}

async function appendClaimEvent(input: {
  event: ClaimEventName;
  panelId?: string | null;
  intentId?: string | null;
}): Promise<void> {
  const row = {
    id: crypto.randomUUID(),
    event: input.event,
    panelId: input.panelId ?? null,
    intentId: input.intentId ?? null,
    createdAt: new Date(resolveNowMs()).toISOString(),
  };
  if (claimStoreUsesMemory()) {
    memorySlot().events.unshift(row);
    return;
  }
  const db = getDb();
  if (!db) return;
  await db.insert(campaignClaimEvents).values({
    id: row.id,
    event: row.event,
    panelId: row.panelId,
    intentId: row.intentId,
    createdAt: new Date(row.createdAt),
  });
}

function highestPaidBidUsd(
  bids: readonly IntentBid[],
  panelId: string,
): number | null {
  const paid = bids.filter(
    (bid) =>
      bid.panelId === panelId &&
      (bid.kind ?? "bid") !== "claim" &&
      countsAsPublicStanding(bid),
  );
  if (paid.length === 0) return null;
  return Math.max(...paid.map((bid) => bid.standingUsd));
}

async function snapshotPanels(): Promise<CommittedPanelInput[]> {
  const bids = await listAllIntentBids();
  const rows: CommittedPanelInput[] = [];
  for (const panel of PANELS) {
    const state = await loadPanelClaimState(panel.id);
    rows.push({
      panelId: panel.id,
      claimStatus: state.claimStatus,
      claimPriceUsd: state.claimPriceUsd,
      highestPaidBidUsd: highestPaidBidUsd(bids, panel.id),
    });
  }
  return rows;
}

async function refundIntent(bid: IntentBid): Promise<void> {
  if (bid.paymentId) {
    await refundDepositPayment(bid.paymentId, bid.id);
  }
  await patchDepositBid(bid.id, {
    refundStatus: "refunded",
    status: bid.status === "approved" ? "outbid" : "outbid",
  });
  await appendClaimEvent({
    event: "refund",
    panelId: bid.panelId,
    intentId: bid.id,
  });
}

export async function expireOpenCheckouts(): Promise<void> {
  const bids = await listAllIntentBids();
  for (const bid of bids) {
    if (hasPaidDeposit(bid)) continue;
    if ((bid.refundStatus ?? "none") !== "none") continue;
    if (bid.checkoutSessionId) {
      await expireCheckoutSession(bid.checkoutSessionId);
    }
    await patchDepositBid(bid.id, {
      refundStatus: "refunded",
      status: "withdrawn",
    });
    await appendClaimEvent({
      event: "refund",
      panelId: bid.panelId,
      intentId: bid.id,
    });
  }
}

export async function refreshCampaignClaimState(): Promise<CampaignClaimRow> {
  const prior = await loadCampaignClaimState();
  const snapshot = await snapshotPanels();
  const total = committedTotalUsd(snapshot);
  const claimedCount = snapshot.filter((row) => row.claimStatus === "claimed")
    .length;
  const trigger = purchaseTrigger({
    committedTotalUsd: total,
    claimedCount,
    panelCount: PANELS.length,
  });
  const now = new Date(resolveNowMs()).toISOString();
  let next: CampaignClaimRow = {
    committedTotalUsd: total,
    tierLocked: trigger.tierLocked,
    purchaseTriggeredAt:
      trigger.tierLocked === "purchase"
        ? prior.purchaseTriggeredAt ?? now
        : null,
    boardClosedReason: trigger.boardClosed
      ? "all_claimed"
      : prior.boardClosedReason === "buyout" ||
          prior.boardClosedReason === "close_at"
        ? prior.boardClosedReason
        : null,
  };
  if (prior.boardClosedReason === "buyout") {
    next = {
      ...next,
      boardClosedReason: "buyout",
      tierLocked: prior.tierLocked,
      purchaseTriggeredAt: prior.purchaseTriggeredAt,
    };
  }
  await writeCampaign(next);
  if (prior.tierLocked !== "purchase" && next.tierLocked === "purchase") {
    await appendClaimEvent({ event: "purchase_triggered" });
  }
  if (prior.tierLocked === "purchase" && next.tierLocked === "none") {
    await appendClaimEvent({ event: "purchase_unlocked" });
  }
  if (next.boardClosedReason === "all_claimed" && prior.boardClosedReason !== "all_claimed") {
    await expireOpenCheckouts();
  }
  return next;
}

export function bidTimesForSoftClose(bids: readonly IntentBid[]): string[] {
  return bids
    .filter((bid) => (bid.kind ?? "bid") !== "claim")
    .map((bid) => bid.createdAt);
}

export function isBoardClosed(state: CampaignClaimRow): boolean {
  return state.boardClosedReason != null;
}

export async function claimPaymentMayCommit(panelId: string): Promise<boolean> {
  const bids = await listAllIntentBids();
  const campaign = await loadCampaignClaimState();
  return panelStillClaimable(panelId, bids, campaign);
}

async function panelStillClaimable(
  panelId: string,
  bids: readonly IntentBid[],
  campaign: CampaignClaimRow,
): Promise<boolean> {
  const panel = PANELS.find((row) => row.id === panelId);
  if (!panel) return false;
  const state = await loadPanelClaimState(panelId);
  return claimable({
    claimStatus: state.claimStatus,
    highestPaidBidUsd: highestPaidBidUsd(bids, panelId),
    campaignOpen: depositDeskOpen(bidTimesForSoftClose(bids)) || !resolveLiveBidding(),
    boardClosed: isBoardClosed(campaign),
    claimPriceUsd: panel.claimPriceUsd,
  });
}

export async function placePanelClaim(input: {
  panelId: string;
  brandLabel: string;
  tradeLabel: string;
  email: string;
  origin: string;
  idempotencyKey?: string | null;
}): Promise<PlaceClaimResult> {
  const panel = PANELS.find((row) => row.id === input.panelId);
  if (!panel) {
    return { ok: false, status: 400, code: "bad_panel", error: "Unknown panel." };
  }
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, status: 400, code: "bad_email", error: "Email is required." };
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
    return { ok: false, status: 400, code: "banned_trade", error: allowed.error };
  }
  const bids = await listAllIntentBids();
  const campaign = await loadCampaignClaimState();
  const live = resolveLiveBidding();
  if (live && !depositDeskOpen(bidTimesForSoftClose(bids))) {
    return {
      ok: false,
      status: 403,
      code: "bidding_closed",
      error: "Bidding is not open.",
    };
  }
  if (isBoardClosed(campaign)) {
    return {
      ok: false,
      status: 403,
      code: "board_closed",
      error: "The board is closed.",
    };
  }
  const open = live ? depositDeskOpen(bidTimesForSoftClose(bids)) : true;
  if (
    !claimable({
      claimStatus: (await loadPanelClaimState(panel.id)).claimStatus,
      highestPaidBidUsd: highestPaidBidUsd(bids, panel.id),
      campaignOpen: open,
      boardClosed: isBoardClosed(campaign),
      claimPriceUsd: panel.claimPriceUsd,
    })
  ) {
    return {
      ok: false,
      status: 409,
      code: "not_claimable",
      error: "This panel is not available to claim.",
    };
  }
  const depositUsd = claimDepositUsd(panel.claimPriceUsd);
  const userId = `deposit:${email}`;
  const idempotencyKey = input.idempotencyKey?.trim() || null;
  if (!live) {
    const intent = await insertDepositBid({
      panelId: panel.id,
      userId,
      brandLabel,
      tradeLabel,
      standingUsd: panel.claimPriceUsd,
      depositUsd,
      creditUsd: 0,
      idempotencyKey,
      checkoutSessionId: null,
      depositPaidAt: null,
      capturedUsd: 0,
      paymentId: null,
      kind: "claim",
    });
    return {
      ok: true,
      bidId: intent.id,
      depositDueUsd: depositUsd,
      checkoutUrl: null,
      covered: false,
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
  const pending = await insertDepositBid({
    panelId: panel.id,
    userId,
    brandLabel,
    tradeLabel,
    standingUsd: panel.claimPriceUsd,
    depositUsd,
    creditUsd: 0,
    idempotencyKey,
    checkoutSessionId: null,
    depositPaidAt: null,
    capturedUsd: 0,
    paymentId: null,
    kind: "claim",
  });
  const session = await createCheckoutSession({
    bidId: pending.id,
    amountUsd: depositUsd,
    description: `BrandMyBeast claim deposit for ${panel.name}`,
    email,
    kind: "claim",
    successUrl: `${input.origin}/bid/return?bid=${pending.id}`,
    cancelUrl: `${input.origin}/panels/${panel.id}?checkout=cancelled`,
    extraMetadata: {
      panel_n: String(panelBoardMarkFor(panel.id).n),
      claim_price_usd: String(panel.claimPriceUsd),
      idempotency_key: idempotencyKey ?? pending.id,
    },
  });
  await patchDepositBid(pending.id, { checkoutSessionId: session.id });
  return {
    ok: true,
    bidId: pending.id,
    depositDueUsd: depositUsd,
    checkoutUrl: session.url,
    covered: false,
  };
}

async function markPanelWithdrawn(panelId: string, intentId?: string): Promise<void> {
  const state = await loadPanelClaimState(panelId);
  if (state.claimStatus === "claimed") return;
  if (state.claimStatus === "withdrawn") return;
  await writePanel({
    ...state,
    claimStatus: "withdrawn",
    claimedIntentId: null,
    claimedAt: null,
  });
  await appendClaimEvent({
    event: "claim_withdrawn",
    panelId,
    intentId: intentId ?? null,
  });
}

async function markPanelClaimed(panelId: string, intent: IntentBid): Promise<void> {
  const state = await loadPanelClaimState(panelId);
  await writePanel({
    ...state,
    claimStatus: "claimed",
    claimedIntentId: intent.id,
    claimedAt: new Date(resolveNowMs()).toISOString(),
  });
  await appendClaimEvent({
    event: "claim",
    panelId,
    intentId: intent.id,
  });
}

async function outbidLowerOnPanel(winner: IntentBid): Promise<void> {
  const bids = await listAllIntentBids();
  for (const other of bids) {
    if (other.id === winner.id || other.panelId !== winner.panelId) continue;
    if (!hasPaidDeposit(other)) continue;
    if ((other.refundStatus ?? "none") !== "none") continue;
    await refundIntent(other);
  }
}

export async function onPaidIntent(intent: IntentBid): Promise<void> {
  const campaign = await loadCampaignClaimState();
  if (isBoardClosed(campaign) && (intent.kind ?? "bid") !== "claim") {
    await refundIntent(intent);
    return;
  }
  const bids = await listAllIntentBids();
  const panel = PANELS.find((row) => row.id === intent.panelId);
  if (!panel) return;
  if ((intent.kind ?? "bid") === "claim") {
    const still = await panelStillClaimable(intent.panelId, bids, campaign);
    if (!still) {
      await refundIntent(intent);
      await refreshCampaignClaimState();
      return;
    }
    await outbidLowerOnPanel(intent);
    await patchDepositBid(intent.id, { status: "approved" });
    const updated = (await getIntentBidById(intent.id)) ?? intent;
    await markPanelClaimed(intent.panelId, updated);
    await refreshCampaignClaimState();
    return;
  }
  if ((await loadPanelClaimState(intent.panelId)).claimStatus === "claimed") {
    await refundIntent(intent);
    await refreshCampaignClaimState();
    return;
  }
  if (intent.standingUsd >= panel.claimPriceUsd) {
    await markPanelWithdrawn(intent.panelId, intent.id);
  }
  await refreshCampaignClaimState();
}

export async function rejectClaimBrandCheck(intentId: string): Promise<void> {
  const intent = await getIntentBidById(intentId);
  if (!intent) return;
  await refundIntent(intent);
  await patchDepositBid(intent.id, { status: "rejected", refundStatus: "refunded" });
  const state = await loadPanelClaimState(intent.panelId);
  await writePanel({
    ...state,
    claimStatus: "available",
    claimedIntentId: null,
    claimedAt: null,
  });
  await appendClaimEvent({
    event: "claim_released",
    panelId: intent.panelId,
    intentId,
  });
  await refreshCampaignClaimState();
}

export async function applyBuyoutRelease(): Promise<{ ok: true } | { ok: false; error: string }> {
  const campaign = await loadCampaignClaimState();
  if (!buyoutAvailable({
    tierLocked: campaign.tierLocked,
    boardClosed: isBoardClosed(campaign),
  })) {
    return { ok: false, error: "Buyout is not available." };
  }
  const bids = await listAllIntentBids();
  for (const bid of bids) {
    if ((bid.refundStatus ?? "none") !== "none") continue;
    if (hasPaidDeposit(bid) || bid.checkoutSessionId) {
      if (bid.checkoutSessionId && !hasPaidDeposit(bid)) {
        await expireCheckoutSession(bid.checkoutSessionId);
      }
      if (hasPaidDeposit(bid) && bid.paymentId) {
        await refundDepositPayment(bid.paymentId, bid.id);
      }
      await patchDepositBid(bid.id, {
        refundStatus: "refunded",
        status: "outbid",
      });
      await appendClaimEvent({
        event: "refund",
        panelId: bid.panelId,
        intentId: bid.id,
      });
    }
  }
  for (const panel of PANELS) {
    const state = await loadPanelClaimState(panel.id);
    const wasClaimed = state.claimStatus === "claimed";
    await writePanel({
      ...state,
      claimStatus: "available",
      claimedIntentId: null,
      claimedAt: null,
    });
    if (wasClaimed) {
      await appendClaimEvent({
        event: "claim_released",
        panelId: panel.id,
        intentId: state.claimedIntentId,
      });
    }
  }
  await writeCampaign({
    committedTotalUsd: 0,
    tierLocked: "none",
    purchaseTriggeredAt: null,
    boardClosedReason: "buyout",
  });
  return { ok: true };
}

export function closeOutcomeForTotal(totalUsd: number) {
  return closeTier(totalUsd);
}

export async function panelClaimView(panelId: string) {
  const bids = await listAllIntentBids();
  const campaign = await loadCampaignClaimState();
  const state = await loadPanelClaimState(panelId);
  const panel = PANELS.find((row) => row.id === panelId);
  const highest = highestPaidBidUsd(bids, panelId);
  const open = depositDeskOpen(bidTimesForSoftClose(bids));
  return {
    ...state,
    highestPaidBidUsd: highest,
    claimable: panel
      ? claimable({
          claimStatus: state.claimStatus,
          highestPaidBidUsd: highest,
          campaignOpen: open,
          boardClosed: isBoardClosed(campaign),
          claimPriceUsd: panel.claimPriceUsd,
        })
      : false,
    campaign,
  };
}
