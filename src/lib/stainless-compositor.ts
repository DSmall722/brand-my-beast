/**
 * Slice 3.1 / 10.5 — stainless compositor on the seat.
 * Preview only: wrap vs etch shaders on steel. No capture, no clock.
 * Labels come from PUBLIC_COPY only. Immortal = etch. Never “permanent vinyl.”
 */

import { GOAL_USD, formatUsd } from "./campaign";
import { PUBLIC_COPY } from "./public-copy";

export type CompositorFinish = "wrap" | "etch";

export const STAINLESS_COMPOSITOR_LEAD =
  `Stainless compositor on this seat — preview only. Wrap film and Immortal etch are shaders on steel, not a photo of a truck that does not exist. Etch stays locked under ${formatUsd(GOAL_USD)}. Still no card charge.`;

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
  if (!lower.includes("preview")) return false;
  return true;
}
