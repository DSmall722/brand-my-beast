/**
 * P2 soft-auction domain: standing bids as intent only.
 * No Stripe fields. Capture is P3. See P2.md and RULES.md.
 */

import { DEPOSIT_PERCENT, type Panel } from "./campaign";

/** Auth.js user id once wired. Opaque string until then. */
export type UserId = string;

export type IntentBidStatus =
  | "listed"
  | "outbid"
  | "withdrawn"
  | "approved"
  | "rejected";

/**
 * A standing mark on one panel. Money fields are dollars, not cents.
 * `depositUsd` is informational on P2 — never charged here.
 */
export type IntentBid = {
  id: string;
  panelId: Panel["id"];
  userId: UserId;
  brandLabel: string;
  standingUsd: number;
  depositUsd: number;
  status: IntentBidStatus;
  createdAt: string;
};

/** Next bid = standing + max($250, 10% of standing). */
export function minIncrementUsd(standingUsd: number): number {
  if (!Number.isFinite(standingUsd) || standingUsd < 0) {
    throw new Error("standingUsd must be a non-negative finite number");
  }
  return Math.max(250, Math.ceil(standingUsd * 0.1));
}

export function nextStandingUsd(currentStandingUsd: number): number {
  return currentStandingUsd + minIncrementUsd(currentStandingUsd);
}

/** 20% of the listed mark. Intent only on P2 — do not charge. */
export function depositUsdForMark(markUsd: number): number {
  if (!Number.isFinite(markUsd) || markUsd <= 0) {
    throw new Error("markUsd must be a positive finite number");
  }
  return Math.ceil((markUsd * DEPOSIT_PERCENT) / 100);
}

export function assertIntentOnly(bid: IntentBid): void {
  const forbidden = bid as IntentBid & {
    stripePaymentMethodId?: unknown;
    capturedAt?: unknown;
    setupIntentId?: unknown;
  };
  if (
    forbidden.stripePaymentMethodId != null ||
    forbidden.capturedAt != null ||
    forbidden.setupIntentId != null
  ) {
    throw new Error("P2 IntentBid must not carry Stripe capture fields");
  }
}
