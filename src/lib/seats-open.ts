import { SEATS_OPEN } from "./campaign";
import { PUBLIC_COPY } from "./public-copy";
import { getSeatsOpenOverride } from "./seats-open-store";

export type IntentFormMode = "list" | "waitlist-only";

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
  return true;
}

export function intentWaitlistOnlyCopy(): string {
  return PUBLIC_COPY.intent.seatsClosedWaitlistOnly;
}

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

export function seatsOpenToggleRejectsDate(raw: unknown): boolean {
  if (raw == null) return true;
  if (typeof raw === "string" && raw.trim() === "") return true;
  return false;
}
