export type SecurityHeader = { key: string; value: string };

export const RESEND_CALLBACK_ORIGIN = "https://brandmybeast.com" as const;

export const CSP_FORM_ACTION =
  `form-action 'self' ${RESEND_CALLBACK_ORIGIN}` as const;

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
