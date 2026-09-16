/**
 * Slice 11.1 — CSP / security headers for next.config.
 * Slice 13.35 — form-action includes Resend magic-link callback host.
 * No Stripe. Does not set CLOSE_AT.
 *
 * Keep this module free of `@/` aliases — next.config imports it directly.
 */

export type SecurityHeader = { key: string; value: string };

/**
 * Auth.js Resend magic-link callbacks land on the public site origin
 * (`/api/auth/callback/resend`). Must match BRAND.domain in campaign.ts
 * (brandmybeast.com). Keep `'self'` for same-origin posts and list the
 * production host so form-action stays valid when the request origin
 * differs from AUTH_URL (proxy / preview edge cases).
 */
export const RESEND_CALLBACK_ORIGIN = "https://brandmybeast.com" as const;

/** CSP form-action: self + Resend/Auth callback host. */
export const CSP_FORM_ACTION =
  `form-action 'self' ${RESEND_CALLBACK_ORIGIN}` as const;

/** Applied to all routes via next.config headers(). */
export const SECURITY_HEADERS: readonly SecurityHeader[] = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      CSP_FORM_ACTION,
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
] as const;

export function securityHeadersSource(): string {
  return "/:path*";
}

export function securityHeaderValue(key: string): string | undefined {
  return SECURITY_HEADERS.find(
    (row) => row.key.toLowerCase() === key.toLowerCase(),
  )?.value;
}
