/**
 * Auth.js mode gate. Parse env at the boundary; callers trust the result.
 * See P2.md — live magic-link secrets are optional; test mode keeps CI green.
 */

import { BRAND } from "@/lib/campaign";

export type AuthMode = "test" | "live";

/** Partial env bags from tests; same shape as operator helpers. */
export type AuthEnv = Record<string, string | undefined>;

/**
 * Slice 7.7 — default Resend magic-link From. Must stay BrandMyBeast + hello@.
 * RESEND_FROM may override in ops; the default in auth config is this string.
 */
export const MAGIC_LINK_FROM = `${BRAND.name} <${BRAND.email}>` as const;

export function resolveMagicLinkFrom(env: AuthEnv = process.env): string {
  const override = env.RESEND_FROM?.trim();
  return override || MAGIC_LINK_FROM;
}

export function resolveAuthMode(env: AuthEnv = process.env): AuthMode {
  const raw = (env.AUTH_MODE ?? "").trim().toLowerCase();
  if (raw === "test" || raw === "live") return raw;
  if (env.NODE_ENV === "production" && env.VERCEL_ENV === "production") {
    return "live";
  }
  return "test";
}

export function authSecretOrThrow(env: AuthEnv = process.env): string {
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

function hasResendMagicLink(env: AuthEnv): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.DATABASE_URL?.trim());
}

/**
 * Slice 8.10 — boot assert: test login hatch cannot be on in Vercel Production.
 * Throws so the process fails closed instead of exposing credentials auth.
 */
export function assertTestLoginNotInProduction(
  env: AuthEnv = process.env,
): void {
  if (
    env.VERCEL_ENV === "production" &&
    env.AUTH_ENABLE_TEST_LOGIN === "1"
  ) {
    throw new Error(
      "AUTH_ENABLE_TEST_LOGIN cannot be on when VERCEL_ENV=production.",
    );
  }
}

/**
 * Test login is CI/local only (AUTH_MODE=test).
 * Production (live) uses Resend magic link when RESEND_API_KEY + DATABASE_URL
 * are set. GitHub stays optional. AUTH_ENABLE_TEST_LOGIN=1 is a staging hatch —
 * never on VERCEL_ENV=production (slice 8.10).
 */
export function enabledAuthProviders(
  env: AuthEnv = process.env,
): AuthProviderId[] {
  assertTestLoginNotInProduction(env);
  const mode = resolveAuthMode(env);
  const ids: AuthProviderId[] = [];
  const allowTestLogin =
    env.VERCEL_ENV !== "production" &&
    (mode === "test" || env.AUTH_ENABLE_TEST_LOGIN === "1");
  if (allowTestLogin) {
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
