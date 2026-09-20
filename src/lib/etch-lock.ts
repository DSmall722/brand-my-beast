/**
 * Slice 3.2 — etch control lock under buyout.
 * Panel may be etch-capable steel, but controls stay off until raised ≥ GOAL_USD.
 */

import { isEtchable, isEtchUnlocked, type Panel } from "./campaign";

/** Seat / mockup etch controls: panel must be etchable AND buyout cleared. */
export function etchControlsEnabled(
  panel: Panel,
  raisedUsd: number,
): boolean {
  return isEtchable(panel) && isEtchUnlocked(raisedUsd);
}

export function etchLockCopy(raisedUsd: number): string {
  if (isEtchUnlocked(raisedUsd)) {
    return "Etch unlocked.";
  }
  return "Etch stays locked until buyout.";
}
