/**
 * Slice 12.27 — opening-bid rationale one-liner on the seat.
 * RULES.md only. No invented pricing story.
 */

import { FLOOR_USD, formatUsd } from "./campaign";

/**
 * RULES.md Inventory: “The floor is not the sum of openings.
 * Bidding has to carry the board to $58,000.”
 */
export const OPENING_BID_RATIONALE =
  `Opening marks start the seat. The floor is not the sum of openings — bidding has to carry the board to ${formatUsd(FLOOR_USD)}.`;

export const OPENING_BID_RATIONALE_SOURCE = "RULES.md" as const;
