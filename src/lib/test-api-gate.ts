/**
 * Slice 7.3 — `/api/test/*` must not be reachable in production.
 * True when VERCEL_ENV=production **or** NODE_ENV=production.
 */

export type RuntimeEnv = {
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export function isProductionRuntime(
  env: RuntimeEnv = process.env,
): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

/** Bare 404 when production; null when test routes may run. */
export function testApiBlockedResponse(
  env: RuntimeEnv = process.env,
): Response | null {
  if (!isProductionRuntime(env)) return null;
  return new Response(null, { status: 404 });
}
