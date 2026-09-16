/**
 * Slice 12.26 — live deposit preview copy on the seat form.
 * Always via depositUsdForMark. Intent only — not charged.
 */

import { DEPOSIT_PERCENT, formatUsd } from "./campaign";
import { depositUsdForMark } from "./intent";

/**
 * Exact seat preview line: “20% of this mark is $X. Not charged.”
 */
export function depositPreviewCopy(markUsd: number): string {
  const deposit = depositUsdForMark(markUsd);
  return `${DEPOSIT_PERCENT}% of this mark is ${formatUsd(deposit)}. Not charged.`;
}

export function tryDepositPreviewCopy(markUsd: number): string | null {
  if (!Number.isFinite(markUsd) || markUsd <= 0) return null;
  return depositPreviewCopy(markUsd);
}
