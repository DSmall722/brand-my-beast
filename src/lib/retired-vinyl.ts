/**
 * Retired-vinyl framed artifact copy (FEATURES P5 #48).
 * After wrap term — not cash, not a VIN, not immortal etch.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const RETIRED_VINYL_LEAD = `After 12 months from install, wrap vinyl can be framed. Not a panel bid. Not cash. No reserved VIN. Miss ${formatUsd(FLOOR_USD)} and there is no truck, no vinyl. Buyout ${formatUsd(GOAL_USD)} does not extend the wrap term. Still no card charge.`;

export const RETIRED_VINYL_FACTS = [
  {
    id: "wrap-term",
    text: "Wrap term is 12 months from install day — not from close.",
  },
  {
    id: "framed-record",
    text: "The retired film is the artifact. Immortal etch is steel, not vinyl.",
  },
  {
    id: "not-cash",
    text: "Not a cash refund. No invented price. No livestream.",
  },
  {
    id: "floor-miss",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No framed vinyl.`,
  },
] as const;

export function retiredVinylCopyIsSafe(): boolean {
  const blob = [
    RETIRED_VINYL_LEAD,
    ...RETIRED_VINYL_FACTS.map((fact) => fact.text),
  ].join(" ");
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(blob)
  );
}
