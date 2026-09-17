/**
 * Slice 9.9 — public seat log: amount + time. No bidder email / user id.
 * Slice 14.35 — display times are America/New_York, labeled ET.
 */

import { formatUsd } from "./campaign";
import type { IntentBid } from "./intent";

/** Public seat log display timezone (Eastern). */
export const SEAT_LOG_TIME_ZONE = "America/New_York" as const;

export type PublicSeatLogEntry = {
  bidId: string;
  amountUsd: number;
  amountLabel: string;
  /** ISO-8601 UTC from the ledger (machine-readable dateTime). */
  createdAt: string;
  /** America/New_York display labeled ET (no email). */
  timeLabel: string;
  brandLabel: string;
  status: IntentBid["status"];
};

/**
 * Format ledger time for the public seat log.
 * Slice 14.35 — America/New_York, labeled ET. No bidder identity.
 */
export function formatSeatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: SEAT_LOG_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${formatted} ET`;
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
