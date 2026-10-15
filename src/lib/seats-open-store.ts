const globalStore = globalThis as typeof globalThis & {
  __bmbSeatsOpenOverride?: boolean | null;
};

export function getSeatsOpenOverride(): boolean | null {
  return globalStore.__bmbSeatsOpenOverride ?? null;
}

export function setSeatsOpenOverride(open: boolean): {
  ok: true;
  seatsOpen: boolean;
} | { ok: false; error: string } {
  globalStore.__bmbSeatsOpenOverride = open;
  return { ok: true, seatsOpen: open };
}

export function resetSeatsOpenOverrideForTests(): void {
  globalStore.__bmbSeatsOpenOverride = null;
}
