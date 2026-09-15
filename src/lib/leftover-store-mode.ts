/**
 * Slice 7.4 — plaque / sighting / circuit / content-rights stores.
 * Memory is CI/local only. Production never uses an in-memory Map
 * (same rule as 6.7 waitlist + intent). No Postgres tables yet —
 * production callers must fail closed.
 */

export type LeftoverStoreEnv = {
  VERCEL_ENV?: string;
  NODE_ENV?: string;
  LEFTOVER_STORE_MODE?: string;
};

/**
 * True only outside Production. Vercel Production and NODE_ENV=production
 * never return true, even if LEFTOVER_STORE_MODE=memory is mis-set.
 */
export function leftoverStoreUsesMemory(
  env: LeftoverStoreEnv = process.env as LeftoverStoreEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.NODE_ENV === "production") return false;
  if (env.LEFTOVER_STORE_MODE === "off") return false;
  if (env.LEFTOVER_STORE_MODE === "memory") return true;
  return true;
}

export function leftoverStoreUnavailableError(store: string): Error {
  return new Error(
    `${store} has no Production memory store. Wire Postgres before enabling TRUCK_EXISTS.`,
  );
}
