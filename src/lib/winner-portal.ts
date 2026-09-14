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
    id: "vault-certificate",
    text: `Immortal vault certificate ships after install only at ${formatUsd(GOAL_USD)}. Not cash. No VIN.`,
  },
  {
    id: "retired-vinyl",
    text: "Retired wrap vinyl can be framed after 12 months from install. Not cash. No VIN.",
  },
  {
    id: "season-two",
    text: "Season 2 wrap is a new buy after the 12-month term — not a gift. First refusal is not sold in v1.",
  },
  {
    id: "rain-night-lighting",
    text: `Rain/night lighting unlocks only at ${formatUsd(GOAL_USD)}. Not a livestream. No reserved VIN.`,
  },
  {
    id: "truck-order-tracker",
    text: `Truck-order tracker opens after the floor. Buyout ${formatUsd(GOAL_USD)} buys the truck. No reserved VIN.`,
  },
  {
    id: "weekly-mileage-ledger",
    text: "Weekly mileage ledger stays empty until the truck exists. No invented miles. No reserved VIN.",
  },
  {
    id: "landmark-proof-log",
    text: "Landmark proof log stays empty until the truck exists. No invented visits. No reserved VIN.",
  },
  {
    id: "city-time-heatmap",
    text: "City time-in-market heatmap stays empty until the truck exists. No invented city hours. No reserved VIN.",
  },
  {
    id: "qr-nfc-scan-counter",
    text: "QR / NFC raw scan counter stays empty until the truck exists. No invented scan counts. No reserved VIN.",
  },
  {
    id: "city-ping-winner",
    text: "City ping to the panel winner stays empty until the truck exists. No invented city pings. No reserved VIN.",
  },
  {
    id: "charge-stop-slots",
    text: "Charge-stop takeover slots stay empty until the truck exists. No invented slot prices. No reserved VIN.",
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
