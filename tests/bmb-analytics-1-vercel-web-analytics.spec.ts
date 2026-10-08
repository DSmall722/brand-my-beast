import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { redactAnalyticsUrl } from "../src/lib/analytics-url";

/**
 * BMB-ANALYTICS-1 — Vercel Web Analytics.
 * Cookieless, same-origin on Vercel. No personal data on custom events.
 * CSP stays 'self'. The component mounts only when VERCEL is set so
 * `next dev` does not load va.vercel-scripts.com.
 */

test.describe("BMB-ANALYTICS-1", () => {
  test("layout renders Analytics only when VERCEL is set", () => {
    const src = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(src).toMatch(/process\.env\.VERCEL\s*\?\s*<SiteAnalytics\s*\/>/);
    const wrapper = readFileSync(
      join(process.cwd(), "src/components/SiteAnalytics.tsx"),
      "utf8",
    );
    expect(wrapper).toContain('"use client"');
    expect(wrapper).toContain('from "@vercel/analytics/next"');
    expect(wrapper).toContain("beforeSend");
  });

  test("pageview URLs keep utm_* and drop tokens, session ids, and hash", () => {
    expect(
      redactAnalyticsUrl(
        "https://brandmybeast.com/waitlist/confirm?token=abc123&utm_source=x#top",
      ),
    ).toBe("https://brandmybeast.com/waitlist/confirm?utm_source=x");
    expect(
      redactAnalyticsUrl(
        "https://brandmybeast.com/bid/return?session_id=cs_test_1&bid=42",
      ),
    ).toBe("https://brandmybeast.com/bid/return");
    expect(
      redactAnalyticsUrl(
        "https://brandmybeast.com/?utm_source=tiktok&utm_campaign=video1",
      ),
    ).toBe("https://brandmybeast.com/?utm_source=tiktok&utm_campaign=video1");
    expect(redactAnalyticsUrl("not a url?token=x")).toBe("not a url");
  });

  test("bid desk tracks bid_start and deposit_checkout with panelId only", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/home/BidDesk.tsx"),
      "utf8",
    );
    expect(src).toContain('from "@vercel/analytics"');
    const calls = [...src.matchAll(/\btrack\([^)]*\)/g)].map((match) => match[0]);
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(call).toContain("panelId");
      expect(call).not.toMatch(/email|brand|trade|amount|standing|logo|yourBid/i);
    }
    const submit = src.slice(src.indexOf("function onSubmit"));
    expect(submit).not.toContain("bid_start");
    const bidAt = src.search(/trackPanel\("bid_start"/);
    expect(bidAt).toBeGreaterThan(-1);
    expect(bidAt).toBeLessThan(src.indexOf("function onSubmit"));
    expect(src).toContain("trackedOpen");
    const depositAt = submit.search(/deposit_checkout/);
    const assignAt = submit.indexOf("window.location.assign");
    expect(depositAt).toBeGreaterThanOrEqual(0);
    expect(depositAt).toBeLessThan(assignAt);
  });

  test("docs record cookieless analytics and the two events", () => {
    const arch = readFileSync(join(process.cwd(), "ARCHITECTURE.md"), "utf8");
    const slices = readFileSync(join(process.cwd(), "SLICES.md"), "utf8");
    expect(arch).toContain("Vercel Web Analytics");
    expect(arch).toContain("/_vercel/insights");
    expect(arch).toContain("bid_start");
    expect(arch).toContain("deposit_checkout");
    expect(arch.toLowerCase()).toContain("no personal data");
    expect(slices).toContain("BMB-ANALYTICS-1");
  });

  test("CSP script-src and connect-src stay same-origin", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/security-headers.ts"),
      "utf8",
    );
    expect(src).toContain("script-src 'self'");
    expect(src).toContain("connect-src 'self'");
    expect(src).not.toContain("va.vercel-scripts.com");
  });
});
