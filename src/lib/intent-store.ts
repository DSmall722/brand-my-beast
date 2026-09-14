/**
 * In-memory intent bid ledger for P2.
 * Intent only — never stores Stripe/capture fields. See P2.md.
 */

import { PANELS, type Panel } from "./campaign";
import {
  assertIntentOnly,
  depositUsdForMark,
  nextStandingUsd,
  type IntentBid,
  type IntentBidStatus,
  type UserId,
} from "./intent";

const globalForIntent = globalThis as typeof globalThis & {
  __bmbIntentBids?: IntentBid[];
};

function bids(): IntentBid[] {
  if (!globalForIntent.__bmbIntentBids) {
    globalForIntent.__bmbIntentBids = [];
  }
  return globalForIntent.__bmbIntentBids;
}

function panelById(panelId: string): Panel | undefined {
  return PANELS.find((panel) => panel.id === panelId);
}

export function listBidsForPanel(panelId: string): IntentBid[] {
  return bids()
    .filter((bid) => bid.panelId === panelId)
    .slice()
    .sort((a, b) => b.standingUsd - a.standingUsd);
}

export function listBidsPendingApproval(): IntentBid[] {
  return bids()
    .filter((bid) => bid.status === "listed")
    .slice()
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function standingForPanel(panelId: string): number {
  const panel = panelById(panelId);
  if (!panel) throw new Error(`Unknown panel: ${panelId}`);
  const active = listBidsForPanel(panelId).filter(
    (bid) => bid.status === "listed" || bid.status === "approved",
  );
  if (active.length === 0) return panel.openingUsd;
  return Math.max(...active.map((bid) => bid.standingUsd));
}

export function minimumIntentUsd(panelId: string): number {
  const panel = panelById(panelId);
  if (!panel) throw new Error(`Unknown panel: ${panelId}`);
  const active = listBidsForPanel(panelId).filter(
    (bid) => bid.status === "listed" || bid.status === "approved",
  );
  if (active.length === 0) return panel.openingUsd;
  return nextStandingUsd(standingForPanel(panelId));
}

export type PlaceIntentInput = {
  panelId: string;
  userId: UserId;
  brandLabel: string;
  standingUsd?: number;
};

export type PlaceIntentResult =
  | { ok: true; bid: IntentBid }
  | { ok: false; error: string };

export function placeIntentBid(input: PlaceIntentInput): PlaceIntentResult {
  const panel = panelById(input.panelId);
  if (!panel) return { ok: false, error: "Unknown panel." };

  const brandLabel = input.brandLabel.trim();
  if (brandLabel.length < 2 || brandLabel.length > 80) {
    return { ok: false, error: "Brand label must be 2–80 characters." };
  }

  const minimum = minimumIntentUsd(input.panelId);
  const standingUsd = input.standingUsd ?? minimum;
  if (standingUsd < minimum) {
    return { ok: false, error: `Mark must be at least ${minimum}.` };
  }

  for (const existing of bids()) {
    if (
      existing.panelId === input.panelId &&
      existing.status === "listed" &&
      existing.userId !== input.userId
    ) {
      existing.status = "outbid";
    }
  }

  const bid: IntentBid = {
    id: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    panelId: panel.id,
    userId: input.userId,
    brandLabel,
    standingUsd,
    depositUsd: depositUsdForMark(standingUsd),
    status: "listed",
    createdAt: new Date().toISOString(),
  };
  assertIntentOnly(bid);
  bids().push(bid);
  return { ok: true, bid };
}

export function setIntentStatus(
  bidId: string,
  status: Extract<IntentBidStatus, "approved" | "rejected" | "withdrawn">,
): PlaceIntentResult {
  const bid = bids().find((row) => row.id === bidId);
  if (!bid) return { ok: false, error: "Bid not found." };
  bid.status = status;
  assertIntentOnly(bid);
  return { ok: true, bid };
}

export function resetIntentStoreForTests(): void {
  globalForIntent.__bmbIntentBids = [];
}
