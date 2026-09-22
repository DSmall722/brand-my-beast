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
 * Slice 17.14 — public /panels/[id] HTML has no Stripe vendor name.
 * Intent-only line stays. CLOSE_AT null. No Stripe package.
 */

test.describe("slice 17.14: panel HTML drops the Stripe vendor name", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("front fascia HTML keeps intent-only and drops Stripe", async ({
    page,
  }) => {
    await page.goto("/panels/front-fascia");
    await expect(page.getByTestId("intent-only-banner")).toHaveCount(0);
    await expect(page.getByTestId("public-seat-waitlist-cta")).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("Stripe");
    expect(html).not.toContain("No Stripe capture");
    expect(html).toContain("$2,000");
    expect(html).toContain("$58,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
