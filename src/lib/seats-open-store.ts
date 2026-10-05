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
 * Set seats open/closed. Does not change the campaign window.
 */
export function setSeatsOpenOverride(open: boolean): {
  ok: true;
  seatsOpen: boolean;
} | { ok: false; error: string } {
  globalStore.__bmbSeatsOpenOverride = open;
  return { ok: true, seatsOpen: open };
}

/** Playwright helper — clear override so env SEATS_OPEN applies again. */
export function resetSeatsOpenOverrideForTests(): void {
  globalStore.__bmbSeatsOpenOverride = null;
}
