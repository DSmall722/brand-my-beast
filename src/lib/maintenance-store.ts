const globalStore = globalThis as typeof globalThis & {
  __bmbMaintenanceOverride?: boolean | null;
};

export function getMaintenanceOverride(): boolean | null {
  return globalStore.__bmbMaintenanceOverride ?? null;
}

export function setMaintenanceOverride(on: boolean):
  | { ok: true; maintenance: boolean }
  | { ok: false; error: string } {
  globalStore.__bmbMaintenanceOverride = on;
  return { ok: true, maintenance: on };
}

export function resetMaintenanceOverrideForTests(): void {
  globalStore.__bmbMaintenanceOverride = null;
}
