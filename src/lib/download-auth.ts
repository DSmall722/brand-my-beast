/**
 * Slice 13.36 — download routes (CSV, PDF, PNG) require operator or owner.
 * 401 when unsigned. 403 when signed in but not allowed.
 *
 * Download operator is narrower than isOperatorEmail in test mode:
 * only operator@example.com (mirrors shop-partner’s shop@example.com).
 * Live still uses OPERATOR_EMAILS. No Stripe. Does not set CLOSE_AT.
 */

import { resolveAuthMode, type AuthEnv } from "@/lib/auth/mode";
import { isShopPartnerEmail } from "@/lib/auth/shop-partner";

export type DownloadAuthFailure = {
  ok: false;
  status: 401 | 403;
  error: string;
};

export function unsignedDownload(): DownloadAuthFailure {
  return { ok: false, status: 401, error: "Sign in required." };
}

export function forbiddenDownload(
  error = "Operator or owner only.",
): DownloadAuthFailure {
  return { ok: false, status: 403, error };
}

/**
 * Live: OPERATOR_EMAILS allow-list.
 * Test: only operator@example.com (not every @example.com).
 */
export function isDownloadOperatorEmail(
  email: string | null | undefined,
  env: AuthEnv = process.env,
): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase();
  const allow = (env.OPERATOR_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allow.includes(normalized)) return true;
  if (
    resolveAuthMode(env) === "test" &&
    normalized === "operator@example.com"
  ) {
    return true;
  }
  return false;
}

/** Operator CSV — operator only (no per-row owner). */
export function canDownloadOperatorCsv(
  email: string | null | undefined,
  env: AuthEnv = process.env,
): boolean {
  return isDownloadOperatorEmail(email, env);
}

/** Shop PDF — shop partner (owner of shop downloads) or operator. */
export function canDownloadShopPdf(
  email: string | null | undefined,
  env: AuthEnv = process.env,
): boolean {
  return (
    isShopPartnerEmail(email, env) || isDownloadOperatorEmail(email, env)
  );
}

/** Seat PNG — standing seat owner or operator. */
export function canDownloadSeatPng(input: {
  email: string | null | undefined;
  userId: string | null | undefined;
  ownerUserId: string | null | undefined;
  env?: AuthEnv;
}): boolean {
  const env = input.env ?? process.env;
  if (isDownloadOperatorEmail(input.email, env)) return true;
  if (
    input.userId &&
    input.ownerUserId &&
    input.userId === input.ownerUserId
  ) {
    return true;
  }
  return false;
}
