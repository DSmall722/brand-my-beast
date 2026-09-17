import { CLOSE_AT } from "./campaign";

/**
 * Slice 14.41 — runtime override for MAINTENANCE (Playwright / operator).
 * Never writes CLOSE_AT. Never stores a date.
 */

const globalStore = globalThis as typeof globalThis & {
  __bmbMaintenanceOverride?: boolean | null;
};

export function getMaintenanceOverride(): boolean | null {
  return globalStore.__bmbMaintenanceOverride ?? null;
}

/**
 * Set maintenance on/off. Refuses if CLOSE_AT is non-null.
 * Does not accept or store any date.
 */
export function setMaintenanceOverride(on: boolean):
  | { ok: true; maintenance: boolean }
  | { ok: false; error: string } {
  if (CLOSE_AT !== null) {
    return {
      ok: false,
      error: "CLOSE_AT must stay null. Maintenance toggle does not set a date.",
    };
  }
  globalStore.__bmbMaintenanceOverride = on;
  return { ok: true, maintenance: on };
}

/** Playwright helper — clear override so env MAINTENANCE applies again. */
export function resetMaintenanceOverrideForTests(): void {
  globalStore.__bmbMaintenanceOverride = null;
}
