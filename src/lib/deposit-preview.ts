/**
 * Slice 12.26 — live deposit preview copy on the seat form.
 * Slice 13.5 — template from PUBLIC_COPY.seat.
 * Always via depositUsdForMark. Intent only — not charged.
 */

import { DEPOSIT_PERCENT, formatUsd } from "./campaign";
import { depositUsdForMark } from "./intent";
import { PUBLIC_COPY } from "./public-copy";

/**
 * Exact seat preview line: “20% of this mark is $X. Not charged.”
 */
export function depositPreviewCopy(markUsd: number): string {
  const deposit = depositUsdForMark(markUsd);
  return PUBLIC_COPY.seat.depositPreviewTemplate
    .replace("{percent}", String(DEPOSIT_PERCENT))
    .replace("{amount}", formatUsd(deposit));
}

export function tryDepositPreviewCopy(markUsd: number): string | null {
  if (!Number.isFinite(markUsd) || markUsd <= 0) return null;
  return depositPreviewCopy(markUsd);
}
