export type LeftoverStoreEnv = {
  VERCEL_ENV?: string;
  NODE_ENV?: string;
  LEFTOVER_STORE_MODE?: string;
};

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
