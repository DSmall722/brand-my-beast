/**
 * Slice 3.1 — stainless compositor on the seat.
 * Preview only: wrap vs etch shaders on steel. No capture, no clock.
 */

import { GOAL_USD, formatUsd } from "./campaign";

export type CompositorFinish = "wrap" | "etch";

export const STAINLESS_COMPOSITOR_LEAD =
  `Stainless compositor on this seat — preview only. Wrap film and Immortal etch are shaders on steel, not a photo of a truck that does not exist. Etch stays locked under ${formatUsd(GOAL_USD)}. Still no card charge.`;

export function compositorFinishLabel(
  finish: CompositorFinish,
  etchable: boolean,
): string {
  if (finish === "etch" && etchable) {
    return `Etch preview · locked under ${formatUsd(GOAL_USD)}`;
  }
  if (etchable) return "Wrap on steel · etch at buyout";
  return "Wrap only";
}

/** Guardrail: compositor copy never invents capture or a close clock. */
export function stainlessCompositorCopyIsSafe(blob: string = STAINLESS_COMPOSITOR_LEAD): boolean {
  const lower = blob.toLowerCase();
  if (lower.includes("lease")) return false;
  if (blob.includes("CLOSE_AT")) return false;
  if (lower.includes("stripe")) return false;
  if (!lower.includes("preview")) return false;
  return true;
}
