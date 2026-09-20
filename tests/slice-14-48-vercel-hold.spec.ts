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
 * Slice 14.48 — Refresh docs/VERCEL-HOLD.md date only. Do not buy credits.
 * Leave vercel.json hold-mode alone. CLOSE_AT null. No Stripe.
 */

const NOTE = join(process.cwd(), "docs/VERCEL-HOLD.md");

test.describe("slice 14.48: VERCEL-HOLD.md date refresh only", () => {
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

  test("VERCEL-HOLD.md has 14.48 date bump and still forbids buying credits", () => {
    expect(existsSync(NOTE)).toBe(true);
    const text = readFileSync(NOTE, "utf8");
    expect(text).toContain("14.48");
    expect(text).toContain("13.49");
    expect(text).toContain("11.10");
    expect(text).toMatch(/\*\*Updated:\*\*\s*2026-09-19 \(16\.47 date bump only\)/);
    expect(text).toMatch(/date bump only|date only|refreshes this note/i);
    expect(text).toMatch(/Do not buy credits/i);
    expect(text).toMatch(/Redeploy when the hold lifts/i);
    expect(text).toMatch(/Leave hold-mode alone/i);
    expect(text).toMatch(/No Stripe/i);
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).not.toContain("CLOSE_AT=");
  });
});
