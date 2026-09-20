/**
 * Slice 3.1 / 10.5 — stainless compositor on the seat.
 * Preview only: wrap vs etch shaders on steel. No capture, no clock.
 * Labels come from PUBLIC_COPY only. Immortal = etch. Never “permanent vinyl.”
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";
import { PUBLIC_COPY } from "./public-copy";

export type CompositorFinish = "wrap" | "etch";

export const STAINLESS_COMPOSITOR_LEAD =
  `Seat preview only. Wrap film and Immortal etch are not a photo of a truck that does not exist. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. Etch stays locked until buyout. Still no card charge.`;

export function compositorModeLabel(finish: CompositorFinish): string {
  return finish === "etch"
    ? PUBLIC_COPY.compositor.modeEtch
    : PUBLIC_COPY.compositor.modeWrap;
}

export function compositorFinishLabel(
  finish: CompositorFinish,
  etchable: boolean,
): string {
  if (finish === "etch" && etchable) {
    return PUBLIC_COPY.compositor.finishEtch;
  }
  if (etchable) return PUBLIC_COPY.compositor.finishWrapEtchable;
  return PUBLIC_COPY.compositor.finishWrapOnly;
}

export function compositorWrapFilmLabel(): string {
  return PUBLIC_COPY.compositor.wrapFilm;
}

export function compositorEtchMarkLabel(): string {
  return PUBLIC_COPY.compositor.etchMark;
}

/** Guardrail: compositor copy never invents capture, a close clock, or permanent vinyl. */
export function stainlessCompositorCopyIsSafe(
  blob: string = STAINLESS_COMPOSITOR_LEAD,
): boolean {
  const lower = blob.toLowerCase();
  if (lower.includes("lease")) return false;
  if (blob.includes("CLOSE_AT")) return false;
  if (lower.includes("stripe")) return false;
  if (lower.includes("permanent vinyl")) return false;
  if (lower.includes("compositor")) return false;
  if (lower.includes("shader")) return false;
  if (/\bvin\b/.test(lower)) return false;
  if (lower.includes("dirty vs clean pair")) return false;
  if (!blob.includes(formatUsd(FLOOR_USD))) return false;
  if (!blob.includes(formatUsd(GOAL_USD))) return false;
  if (!lower.includes("preview")) return false;
  return true;
}
