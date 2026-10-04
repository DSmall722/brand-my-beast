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
 * Set maintenance on/off. Does not change the campaign window.
 */
export function setMaintenanceOverride(on: boolean):
  | { ok: true; maintenance: boolean }
  | { ok: false; error: string } {
  globalStore.__bmbMaintenanceOverride = on;
  return { ok: true, maintenance: on };
}

/** Playwright helper — clear override so env MAINTENANCE applies again. */
export function resetMaintenanceOverrideForTests(): void {
  globalStore.__bmbMaintenanceOverride = null;
}
