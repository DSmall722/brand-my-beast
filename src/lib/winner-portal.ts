/**
 * Winner portal copy + approved-seat filter. Intent only — no capture.
 */

import { GOAL_USD, formatUsd } from "./campaign";
import type { IntentBid } from "./intent";

export const WINNER_PORTAL_FACTS = [
  {
    id: "wrap-term",
    text: "Wrap term is 12 months from install day — not from close.",
  },
  {
    id: "etch-lock",
    text: `Etch stays locked under ${formatUsd(GOAL_USD)} buyout.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN until the campaign clears the floor.",
  },
  {
    id: "no-impressions",
    text: "No invented impression counts. Miles come after the truck exists.",
  },
  {
    id: "no-charge",
    text: "Still no card charge on this path.",
  },
] as const;

export function isWinnerSeat(bid: IntentBid): boolean {
  return bid.status === "approved";
}

export function winnerSeatsFor(bids: readonly IntentBid[]): IntentBid[] {
  return bids.filter(isWinnerSeat);
}
