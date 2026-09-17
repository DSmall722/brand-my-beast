import { CLOSE_AT, SEATS_OPEN } from "./campaign";
import { PUBLIC_COPY } from "./public-copy";
import { getSeatsOpenOverride } from "./seats-open-store";

/**
 * Slice 14.17 / 14.18 — SEATS_OPEN gates intent listing UI.
 * Operator override (14.18) wins over env. Never touches CLOSE_AT or a date.
 * Slice 14.32 — API intent POST returns 403 when closed; waitlist stays 201.
 */

export type IntentFormMode = "list" | "waitlist-only";

/** Effective seats-open: operator override, else env SEATS_OPEN. */
export function resolveSeatsOpen(): boolean {
  const override = getSeatsOpenOverride();
  if (override !== null) return override;
  return SEATS_OPEN;
}

export function intentFormMode(
  seatsOpen: boolean = resolveSeatsOpen(),
): IntentFormMode {
  return seatsOpen ? "list" : "waitlist-only";
}

export function seatsOpenIsSeparateFromCloseAt(): boolean {
  return CLOSE_AT === null;
}

export function intentWaitlistOnlyCopy(): string {
  return PUBLIC_COPY.intent.seatsClosedWaitlistOnly;
}

/** Slice 14.32 — JSON body for intent POST when seats are closed. */
export function seatsClosedIntentPayload(): {
  ok: false;
  error: string;
  code: "seats_closed";
} {
  return {
    ok: false,
    error: intentWaitlistOnlyCopy(),
    code: "seats_closed",
  };
}

/** Operator toggle must never carry a date field. */
export function seatsOpenToggleRejectsDate(raw: unknown): boolean {
  if (raw == null) return true;
  if (typeof raw === "string" && raw.trim() === "") return true;
  return false;
}
