/**
 * P2 soft-auction domain: standing bids as intent only.
 * No Stripe fields. Capture is P3. See P2.md and RULES.md.
 */

import { DEPOSIT_PERCENT, FLOOR_USD, PROXY_MAX_CAP_USD, type Panel } from "./campaign";

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
  /** Free-text trade / category. One brand holds a normalized trade at a time. */
  tradeLabel: string;
  standingUsd: number;
  depositUsd: number;
  status: IntentBidStatus;
  createdAt: string;
  /**
   * Slice 12.2 — optimistic lock token. Writers pass the value they read;
   * a mismatch returns `stale_write`.
   */
  updatedAt: string;
  /**
   * Slice 12.4 — client idempotency key. Replay with the same key returns
   * the original listed bid instead of double-listing.
   */
  idempotencyKey: string | null;
  /**
   * Optional art on the mark: https URL or data:image upload.
   * Intent only — never a charge receipt.
   */
  artworkUrl: string | null;
  /**
   * Optional proxy ceiling (slice 9.1). When outbid, the agent steps
   * standing + max($250, 10%) up to this max. Still intent only — no card.
   */
  proxyMaxUsd: number | null;
  /**
   * Slice 9.4 — floor-save raise-to mark. When set, this row means:
   * if campaign pledged is short of $58,000, raise this seat to this amount.
   * Stored, not charged. Does not displace standing holders until fired.
   */
  floorSaveUsd: number | null;
  /**
   * Slice 12.9 — soft-delete timestamp. Set when status becomes withdrawn.
   * Approved rows are never hard-deleted.
   */
  deletedAt: string | null;
};

/**
 * Slice 13.14 — standing from live listed/approved only (not floor-save,
 * not withdrawn, not outbid). Empty → panel opening. Prevents ghost standing
 * after the sole pending mark withdraws.
 */
export function activeStandingUsd(
  bids: readonly Pick<IntentBid, "status" | "standingUsd" | "floorSaveUsd">[],
  openingUsd: number,
): number {
  const active = bids.filter(
    (bid) =>
      (bid.status === "listed" || bid.status === "approved") &&
      !isFloorSaveBid(bid),
  );
  if (active.length === 0) return openingUsd;
  return Math.max(...active.map((bid) => bid.standingUsd));
}

/** True when the row is a floor-save conditional (slice 9.4). */
export function isFloorSaveBid(bid: Pick<IntentBid, "floorSaveUsd">): boolean {
  return bid.floorSaveUsd != null;
}

/** Slice 9.4 — campaign is short of the $58,000 floor. */
export function isCampaignShortOfFloor(pledgedUsd: number): boolean {
  return Number.isFinite(pledgedUsd) && pledgedUsd < FLOOR_USD;
}

/**
 * Slice 13.13 — floor-save may fire only while pledged is still under $58,000.
 * Same predicate as isCampaignShortOfFloor; named for the fire gate.
 */
export function canFireFloorSave(pledgedUsd: number): boolean {
  return isCampaignShortOfFloor(pledgedUsd);
}

/**
 * Slice 12.7 — normalize bidder-named trade before exclusivity.
 * Trim, lowercase, collapse whitespace. No public taxonomy.
 */
export function normalizeTradeLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Next bid = standing + max($250, 10% of standing). Whole dollars only. */
export function minIncrementUsd(standingUsd: number): number {
  if (
    !Number.isFinite(standingUsd) ||
    !Number.isInteger(standingUsd) ||
    standingUsd < 0
  ) {
    throw new Error("standingUsd must be a non-negative integer dollar amount");
  }
  return Math.max(250, Math.ceil(standingUsd * 0.1));
}

/**
 * Slice 9.2 / 14.34 — next minimum is standing + increment.
 * Always a whole dollar amount for display and listing floors.
 */
export function nextStandingUsd(currentStandingUsd: number): number {
  const next = currentStandingUsd + minIncrementUsd(currentStandingUsd);
  if (!Number.isInteger(next)) {
    throw new Error("next minimum must be an integer dollar amount");
  }
  return next;
}

/**
 * Slice 9.1 / 13.12 — optional proxy ceiling. Empty → null. Must be a whole
 * dollar amount at or above the listed mark and at most PROXY_MAX_CAP_USD
 * ($120,000 buyout). Never a payment method.
 */
export function parseProxyMaxUsd(
  raw: unknown,
  standingUsd: number,
): { ok: true; proxyMaxUsd: number | null } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, proxyMaxUsd: null };
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      error: "Proxy max must be a whole dollar amount.",
    };
  }
  if (!Number.isFinite(standingUsd) || standingUsd <= 0) {
    return { ok: false, error: "Intent mark must be set before proxy max." };
  }
  if (value < standingUsd) {
    return {
      ok: false,
      error: "Proxy max must be at least the intent mark.",
    };
  }
  if (value > PROXY_MAX_CAP_USD) {
    return {
      ok: false,
      error: `Proxy max cannot exceed $${PROXY_MAX_CAP_USD.toLocaleString("en-US")} (buyout cap).`,
    };
  }
  return { ok: true, proxyMaxUsd: value };
}

/**
 * Slice 9.4 — floor-save raise-to amount Y. Whole dollars only.
 * Never a payment method.
 */
export function parseFloorSaveUsd(
  raw: unknown,
): { ok: true; floorSaveUsd: number } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: false, error: "Floor-save mark Y is required." };
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      error: "Floor-save mark must be a whole dollar amount.",
    };
  }
  return { ok: true, floorSaveUsd: value };
}

/**
 * Slice 12.6 — standing mark must be a whole dollar (integer). Empty → omit.
 * Never a payment method.
 */
export function parseStandingUsd(
  raw: unknown,
): { ok: true; standingUsd: number | undefined } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, standingUsd: undefined };
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      error: "Standing mark must be a whole dollar amount.",
    };
  }
  return { ok: true, standingUsd: value };
}

/**
 * Slice 12.5 — deposit is always round(standing * 0.20) via this helper.
 * Intent only on P2 — do not charge.
 */
export function depositUsdForMark(markUsd: number): number {
  if (!Number.isFinite(markUsd) || markUsd <= 0) {
    throw new Error("markUsd must be a positive finite number");
  }
  return Math.round(markUsd * (DEPOSIT_PERCENT / 100));
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

/** Slice 12.2 — typed optimistic-lock failure. */
export const INTENT_STALE_WRITE = "stale_write" as const;
export type IntentWriteErrorCode = typeof INTENT_STALE_WRITE;

export function isStaleWriteError(result: {
  ok: boolean;
  code?: string;
  error?: string;
}): result is { ok: false; code: typeof INTENT_STALE_WRITE; error: string } {
  return result.ok === false && result.code === INTENT_STALE_WRITE;
}

/**
 * Slice 12.4 — idempotency key from the intent form. Empty → null (new list).
 * Opaque client token; never a payment method.
 */
export function parseIdempotencyKey(
  raw: unknown,
): { ok: true; idempotencyKey: string | null } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, idempotencyKey: null };
  }
  const value = String(raw).trim();
  if (value.length < 8 || value.length > 128) {
    return {
      ok: false,
      error: "Idempotency key must be 8–128 characters.",
    };
  }
  if (/\s/.test(value)) {
    return { ok: false, error: "Idempotency key must not contain spaces." };
  }
  return { ok: true, idempotencyKey: value };
}
