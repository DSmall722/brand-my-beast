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
 * Slice 14.4 — README one-pager: what the repo is, what it is not.
 * CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const README = join(process.cwd(), "README.md");

test.describe("slice 14.4: README what it is / what it is not", () => {
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

  test("README one-pager names is / is-not and fences", () => {
    expect(existsSync(README)).toBe(true);
    const text = readFileSync(README, "utf8");
    expect(text).toContain("14.4");
    expect(text).toMatch(/## What this repo is/);
    expect(text).toMatch(/## What this repo is not/);
    expect(text).toContain("SLICES.md");
    expect(text).toContain("CAMPAIGN.md");
    expect(text).toMatch(/not wired/i);
    expect(text).toMatch(/Do not start the 30-day clock/i);
    expect(text).toMatch(/live-URL merge gate|live URL/i);
    expect(text).toMatch(/FEATURES\.md.*catalog|catalog only/i);
    expect(text).toMatch(/No Stripe|not wired/i);
    expect(text).toMatch(/lease/i); // forbidden product called out in "is not"
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toContain("hello@brandmybeast.com");
    expect(text.toLowerCase()).not.toContain("gmail.com");
    // May name SetupIntent only as something we do not do yet.
    expect(text).toMatch(/No Stripe SetupIntent until Wave 15|Stripe is \*\*not wired\*\*/i);
  });
});
