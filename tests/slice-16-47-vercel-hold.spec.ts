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

const NOTE = join(process.cwd(), "docs/VERCEL-HOLD.md");

test.describe("slice 16.47: VERCEL-HOLD.md date bump only", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(35_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBe("2026-12-31T17:00:00.000Z");
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$35,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("VERCEL-HOLD.md date is 2026-09-19 and hold rules are unchanged", () => {
    expect(existsSync(NOTE)).toBe(true);
    const text = readFileSync(NOTE, "utf8");
    expect(text).toContain("16.47");
    expect(text).toContain("14.48");
    expect(text).toMatch(/\*\*Updated:\*\*\s*2026-09-19 \(16\.47 date bump only\)/);
    expect(text).toMatch(/Do not buy credits/i);
    expect(text).toMatch(/Redeploy when the hold lifts/i);
    expect(text).toMatch(/Leave hold-mode alone/i);
    expect(text).toMatch(/No Stripe/i);
    expect(text).toMatch(/\$35,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).not.toContain("CLOSE_AT=");
  });
});
