import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  SECURITY_HEADERS,
  securityHeaderValue,
  securityHeadersSource,
} from "../src/lib/security-headers";

/**
 * Slice 11.1 — CSP / security headers in next.config.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 11.1: CSP / security headers", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("unit: security header set is locked", () => {
    expect(securityHeadersSource()).toBe("/:path*");
    const keys = SECURITY_HEADERS.map((row) => row.key);
    expect(keys).toEqual([
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
    ]);
    expect(securityHeaderValue("X-Frame-Options")).toBe("DENY");
    expect(securityHeaderValue("X-Content-Type-Options")).toBe("nosniff");
    expect(securityHeaderValue("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
    expect(securityHeaderValue("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
    // Slice 13.35 — form-action keeps 'self' and adds Resend callback host.
    expect(securityHeaderValue("Content-Security-Policy")).toContain(
      "form-action 'self' https://brandmybeast.com",
    );
    const cfg = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");
    expect(cfg).toContain("SECURITY_HEADERS");
    expect(cfg).toContain("headers()");
  });

  test("homepage response carries CSP and frame denial", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const headers = res.headers();
    expect(headers["content-security-policy"]).toContain("default-src 'self'");
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");

    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
