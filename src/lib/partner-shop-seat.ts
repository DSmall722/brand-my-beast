/**
 * Slice 13.24 — partner shop seat projection.
 * Brand + trade + art (+ panel / standing for the sheet). Never userId / email.
 */

import type { IntentBid } from "./intent";
import type { Panel } from "./campaign";

export type PartnerShopSeat = {
  bidId: string;
  panelId: Panel["id"];
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
  artworkUrl: string | null;
  status: IntentBid["status"];
};

/** Fields a wrap-shop partner may see. Explicitly omits userId. */
export const PARTNER_SHOP_SEAT_KEYS = [
  "bidId",
  "panelId",
  "brandLabel",
  "tradeLabel",
  "standingUsd",
  "artworkUrl",
  "status",
] as const satisfies readonly (keyof PartnerShopSeat)[];

/**
 * Map an approved ledger bid to the partner sheet view.
 * Drops userId and every other identity field.
 */
export function toPartnerShopSeat(bid: IntentBid): PartnerShopSeat {
  return {
    bidId: bid.id,
    panelId: bid.panelId,
    brandLabel: bid.brandLabel,
    tradeLabel: bid.tradeLabel,
    standingUsd: bid.standingUsd,
    artworkUrl: bid.artworkUrl,
    status: bid.status,
  };
}

export function toPartnerShopSeats(
  bids: readonly IntentBid[],
): PartnerShopSeat[] {
  return bids.map(toPartnerShopSeat);
}

/** True when serialized partner payload still carries a bidder userId key. */
export function partnerSeatLeaksUserId(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) {
    return value.some(partnerSeatLeaksUserId);
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("userId" in record) return true;
    return Object.values(record).some(partnerSeatLeaksUserId);
  }
  return false;
}

/**
 * Slice 13.24 — HTML / PDF / JSON for partners must not include the bidder
 * email (or the `test:email` userId form from Auth.js credentials mode).
 */
export function partnerViewContainsBidderEmail(
  haystack: string,
  bidderEmail: string,
): boolean {
  const email = bidderEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return false;
  const lower = haystack.toLowerCase();
  if (lower.includes(email)) return true;
  // Auth.js test ids are `test:${email}`.
  if (lower.includes(`test:${email}`)) return true;
  return false;
}
