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

export const PARTNER_SHOP_SEAT_KEYS = [
  "bidId",
  "panelId",
  "brandLabel",
  "tradeLabel",
  "standingUsd",
  "artworkUrl",
  "status",
] as const satisfies readonly (keyof PartnerShopSeat)[];

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

export function partnerViewContainsBidderEmail(
  haystack: string,
  bidderEmail: string,
): boolean {
  const email = bidderEmail.trim().toLowerCase();
  if (!email || !email.includes("@")) return false;
  const lower = haystack.toLowerCase();
  if (lower.includes(email)) return true;
  if (lower.includes(`test:${email}`)) return true;
  return false;
}
