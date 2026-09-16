/**
 * Slice 9.9 — public seat log: amount + time. No bidder email / user id.
 */

import { formatUsd } from "./campaign";
import type { IntentBid } from "./intent";

export type PublicSeatLogEntry = {
  bidId: string;
  amountUsd: number;
  amountLabel: string;
  /** ISO-8601 UTC from the ledger. */
  createdAt: string;
  /** Compact UTC display for the public seat (no email). */
  timeLabel: string;
  brandLabel: string;
  status: IntentBid["status"];
};

/** Format ledger time for the public seat log (UTC, no bidder identity). */
export function formatSeatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Build public seat log rows from panel bids.
 * Newest first. Never includes email or userId.
 */
export function buildPublicSeatLog(
  bids: readonly IntentBid[],
): PublicSeatLogEntry[] {
  return bids
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((bid) => ({
      bidId: bid.id,
      amountUsd: bid.standingUsd,
      amountLabel: formatUsd(bid.standingUsd),
      createdAt: bid.createdAt,
      timeLabel: formatSeatLogTime(bid.createdAt),
      brandLabel: bid.brandLabel,
      status: bid.status,
    }));
}
