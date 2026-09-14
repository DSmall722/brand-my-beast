/**
 * Season 2 board copy (FEATURES P5 #49).
 * Year-two wrap is a new buy — not a gift. Do not sell first refusal in v1.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const SEASON_TWO_LEAD = `Season 2 is a new board after the 12-month wrap term. Year-two wrap is a new buy, not a gift. Immortal etch stays until the steel is gone. Floor stays ${formatUsd(FLOOR_USD)}. Buyout stays ${formatUsd(GOAL_USD)}. First refusal is not for sale in v1. No reserved VIN. Still no card charge.`;

export const SEASON_TWO_FACTS = [
  {
    id: "new-buy",
    text: "Year-two wrap is a new buy after 12 months from install — not a gift.",
  },
  {
    id: "etch-stays",
    text: "Immortal etch is not Season 2. Etch lasts until that steel is gone.",
  },
  {
    id: "no-first-refusal",
    text: "Year-2 first refusal is allowed later. It is not sold on this board.",
  },
  {
    id: "money-locks",
    text: `Floor ${formatUsd(FLOOR_USD)} and buyout ${formatUsd(GOAL_USD)} stay locked. No invented Season 2 price.`,
  },
] as const;

export function seasonTwoCopyIsSafe(): boolean {
  const blob = [SEASON_TWO_LEAD, ...SEASON_TWO_FACTS.map((f) => f.text)].join(
    " ",
  );
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\blivestream\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(blob) &&
    !/\$\d/.test(blob.replace(/\$58,000/g, "").replace(/\$120,000/g, ""))
  );
}
