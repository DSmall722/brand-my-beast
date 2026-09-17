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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.9 — docs/STATUS.md: floor, buyout, CLOSE_AT null,
 * Vercel hold, last slice id. No Stripe. No clock. Hold-mode untouched.
 */

const DOC = join(process.cwd(), "docs/STATUS.md");

test.describe("slice 14.9: docs/STATUS.md snapshot", () => {
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
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("STATUS.md names floor, buyout, CLOSE_AT null, hold, last slice", () => {
    expect(existsSync(DOC)).toBe(true);
    const text = readFileSync(DOC, "utf8");
    expect(text).toContain("14.9");
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/\*\*null\*\*|CLOSE_AT.*null/i);
    expect(text).toMatch(/Vercel usage hold|VERCEL-HOLD/i);
    expect(text).toMatch(/deploymentEnabled/);
    expect(text).toMatch(/Last slice id/i);
    expect(text).toMatch(/not wired/i);
    expect(text).toMatch(/Do not start the 30-day clock|30-day clock/i);
    expect(text).toMatch(/SLICES\.md/);
    expect(text).toContain("hello@brandmybeast.com");
    expect(text.toLowerCase()).not.toContain("gmail.com");
    // STATUS may name killed products only via STALE pointer; body avoids the word.
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
