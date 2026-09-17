import { CLOSE_AT, SEATS_OPEN } from "./campaign";
import { PUBLIC_COPY } from "./public-copy";

/**
 * Slice 14.17 — SEATS_OPEN gates intent listing UI. Never touches CLOSE_AT.
 */

export type IntentFormMode = "list" | "waitlist-only";

export function intentFormMode(
  seatsOpen: boolean = SEATS_OPEN,
): IntentFormMode {
  return seatsOpen ? "list" : "waitlist-only";
}

export function seatsOpenIsSeparateFromCloseAt(): boolean {
  return CLOSE_AT === null;
}

export function intentWaitlistOnlyCopy(): string {
  return PUBLIC_COPY.intent.seatsClosedWaitlistOnly;
}
