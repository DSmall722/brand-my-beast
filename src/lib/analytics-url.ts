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
