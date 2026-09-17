import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 13.46 — Document how to run Playwright offline (memory mode).
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

const DOC = join(process.cwd(), "docs/PLAYWRIGHT-OFFLINE.md");
const CONFIG = join(process.cwd(), "playwright.config.ts");

test.describe("slice 13.46: Playwright offline memory-mode docs", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("PLAYWRIGHT-OFFLINE.md documents memory mode and fences", () => {
    expect(existsSync(DOC)).toBe(true);
    const text = readFileSync(DOC, "utf8");
    expect(text).toContain("13.46");
    expect(text).toMatch(/WAITLIST_MODE=memory/);
    expect(text).toMatch(/INTENT_MODE=memory/);
    expect(text).toMatch(/AUTH_MODE=test/);
    expect(text).toMatch(/npm test/);
    expect(text).toMatch(/playwright\.config\.ts/);
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/No Stripe|no stripe/i);
    expect(text).toMatch(/No lease|no lease/i);
    expect(text).toMatch(/VERCEL-HOLD|deploymentEnabled|usage hold/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");

    expect(existsSync(CONFIG)).toBe(true);
    const config = readFileSync(CONFIG, "utf8");
    expect(config).toContain('WAITLIST_MODE: "memory"');
    expect(config).toContain('INTENT_MODE: "memory"');
    expect(config).toContain('AUTH_MODE: "test"');
  });

  test("homepage still locked while offline docs land", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
