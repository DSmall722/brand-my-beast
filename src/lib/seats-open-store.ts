import { CLOSE_AT } from "./campaign";

/**
 * Slice 14.18 — operator runtime override for SEATS_OPEN.
 * Never writes CLOSE_AT. Never stores a date.
 */

const globalStore = globalThis as typeof globalThis & {
  __bmbSeatsOpenOverride?: boolean | null;
};

export function getSeatsOpenOverride(): boolean | null {
  return globalStore.__bmbSeatsOpenOverride ?? null;
}

/**
 * Set seats open/closed. Refuses if CLOSE_AT is non-null.
 * Does not accept or store any date.
 */
export function setSeatsOpenOverride(open: boolean): {
  ok: true;
  seatsOpen: boolean;
} | { ok: false; error: string } {
  if (CLOSE_AT !== null) {
    return {
      ok: false,
      error: "CLOSE_AT must stay null. Seats toggle does not set a date.",
    };
  }
  globalStore.__bmbSeatsOpenOverride = open;
  return { ok: true, seatsOpen: open };
}

/** Playwright helper — clear override so env SEATS_OPEN applies again. */
export function resetSeatsOpenOverrideForTests(): void {
  globalStore.__bmbSeatsOpenOverride = null;
}
