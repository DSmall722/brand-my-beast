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
  CSP_FORM_ACTION,
  RESEND_CALLBACK_ORIGIN,
  securityHeaderValue,
} from "../src/lib/security-headers";

/**
 * Slice 13.35 — CSP form-action 'self' + Resend callback host (builds on 11.1).
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

test.describe("slice 13.35: CSP form-action + Resend callback host", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("unit: form-action is self + brandmybeast.com callback origin", () => {
    expect(RESEND_CALLBACK_ORIGIN).toBe("https://brandmybeast.com");
    expect(CSP_FORM_ACTION).toBe(
      "form-action 'self' https://brandmybeast.com",
    );
    const csp = securityHeaderValue("Content-Security-Policy");
    expect(csp).toContain(CSP_FORM_ACTION);
    expect(csp).toContain("form-action 'self' https://brandmybeast.com");
    // Narrow allowlist: no bare form-action 'self' without the callback host.
    expect(csp).not.toMatch(/form-action 'self';/);
    const src = readFileSync(
      join(process.cwd(), "src/lib/security-headers.ts"),
      "utf8",
    );
    expect(src).toContain("RESEND_CALLBACK_ORIGIN");
    expect(src).toContain("CSP_FORM_ACTION");
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage CSP form-action includes Resend callback host", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const csp = res.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("form-action 'self' https://brandmybeast.com");
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");

    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
