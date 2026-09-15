import { assertTestLoginNotInProduction } from "@/lib/auth/mode";

/**
 * Slice 8.10 — boot assert on Node runtime start.
 * AUTH_ENABLE_TEST_LOGIN=1 + VERCEL_ENV=production must fail closed.
 */
export async function register(): Promise<void> {
  assertTestLoginNotInProduction();
}
