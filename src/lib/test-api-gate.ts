export type RuntimeEnv = {
  VERCEL_ENV?: string;
  NODE_ENV?: string;
};

export function isProductionRuntime(
  env: RuntimeEnv = process.env,
): boolean {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}

export function testApiBlockedResponse(
  env: RuntimeEnv = process.env,
): Response | null {
  if (!isProductionRuntime(env)) return null;
  return new Response(null, { status: 404 });
}
