/**
 * Dirty-vs-clean pair (FEATURES P3 #32).
 * Side-by-side finish preview — no capture, no clock, no invented price.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const DIRTY_CLEAN_PAIR_LEAD = `Dirty vs clean pair. Preview only — not a photo of the truck. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. No reserved VIN. Still no card charge.`;

export function dirtyCleanPairCopyIsSafe(): boolean {
  const lower = DIRTY_CLEAN_PAIR_LEAD.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !DIRTY_CLEAN_PAIR_LEAD.includes("CLOSE_AT") &&
    !DIRTY_CLEAN_PAIR_LEAD.includes("South Carolina home loop") &&
    !DIRTY_CLEAN_PAIR_LEAD.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\blivestream\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(DIRTY_CLEAN_PAIR_LEAD)
  );
}
