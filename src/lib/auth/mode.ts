/**
 * Auth.js mode gate. Parse env at the boundary; callers trust the result.
 * See P2.md — live magic-link secrets are optional; test mode keeps CI green.
 */

export type AuthMode = "test" | "live";

export function resolveAuthMode(
  env: NodeJS.ProcessEnv = process.env,
): AuthMode {
  const raw = (env.AUTH_MODE ?? "").trim().toLowerCase();
  if (raw === "test" || raw === "live") return raw;
  if (env.NODE_ENV === "production" && env.VERCEL_ENV === "production") {
    return "live";
  }
  return "test";
}

export function authSecretOrThrow(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const fromEnv = env.AUTH_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (resolveAuthMode(env) === "test") {
    return "brandmybeast-test-auth-secret-not-for-prod";
  }
  throw new Error(
    "AUTH_SECRET is required when AUTH_MODE=live. Generate one and set it in Vercel.",
  );
}

export type AuthProviderId = "test-login" | "resend" | "github";

function hasResendMagicLink(env: NodeJS.ProcessEnv): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.DATABASE_URL?.trim());
}

/**
 * Test login is CI/local only (AUTH_MODE=test).
 * Production (live) uses Resend magic link when RESEND_API_KEY + DATABASE_URL
 * are set. GitHub stays optional. AUTH_ENABLE_TEST_LOGIN=1 is a staging hatch.
 */
export function enabledAuthProviders(
  env: NodeJS.ProcessEnv = process.env,
): AuthProviderId[] {
  const mode = resolveAuthMode(env);
  const ids: AuthProviderId[] = [];
  if (mode === "test" || env.AUTH_ENABLE_TEST_LOGIN === "1") {
    ids.push("test-login");
  }
  if (mode === "live" && hasResendMagicLink(env)) {
    ids.push("resend");
  }
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) {
    ids.push("github");
  }
  return ids;
}
