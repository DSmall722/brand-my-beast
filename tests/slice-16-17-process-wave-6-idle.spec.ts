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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.17 — PROCESS.md has no leftover “Wave 6 idle” sentence.
 * FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

const PROCESS = join(process.cwd(), "PROCESS.md");

test.describe("slice 16.17: PROCESS.md has no Wave 6 idle sentence", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("PROCESS.md does not say Wave 6 is idle", () => {
    const text = readFileSync(PROCESS, "utf8");
    expect(text).not.toMatch(/wave\s*6\s+idle/i);
    expect(text).toContain("14.3");
    expect(text).toContain("13.1");
    expect(text).toContain("SLICES.md");
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/not wired/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
