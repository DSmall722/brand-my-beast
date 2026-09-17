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
 * Slice 14.6 — RULES.md table of statuses:
 * pending / approved / rejected / outbid / withdrawn.
 * CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const RULES = join(process.cwd(), "RULES.md");

const STATUSES = [
  "pending",
  "approved",
  "rejected",
  "outbid",
  "withdrawn",
] as const;

test.describe("slice 14.6: RULES intent status table", () => {
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

  test("RULES.md lists the five intent statuses", () => {
    expect(existsSync(RULES)).toBe(true);
    const text = readFileSync(RULES, "utf8");
    expect(text).toContain("14.6");
    expect(text).toMatch(/## Intent statuses/);
    for (const status of STATUSES) {
      expect(text).toMatch(new RegExp(`\\*\\*${status}\\*\\*`));
    }
    expect(text).toMatch(/listed/); // pending maps to ledger listed
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/No Stripe|intent-only/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
  });
});
