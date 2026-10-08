/**
 * BMB-ANALYTICS-1 — strip a pageview URL before it goes to Vercel Web Analytics.
 * Keeps only utm_* params so campaign links still attribute. Drops everything
 * else (waitlist confirm tokens, Stripe session_id, bid ids) and the hash.
 */
export function redactAnalyticsUrl(raw: string): string {
  try {
    const url = new URL(raw);
    const kept = new URLSearchParams();
    for (const [key, value] of url.searchParams) {
      if (key.toLowerCase().startsWith("utm_")) kept.append(key, value);
    }
    const query = kept.toString();
    return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
  } catch {
    return raw.split(/[?#]/)[0] ?? "";
  }
}
