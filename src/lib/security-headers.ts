/**
 * Slice 11.1 — CSP / security headers for next.config.
 * No Stripe. Does not set CLOSE_AT.
 */

export type SecurityHeader = { key: string; value: string };

/** Applied to all routes via next.config headers(). */
export const SECURITY_HEADERS: readonly SecurityHeader[] = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
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
