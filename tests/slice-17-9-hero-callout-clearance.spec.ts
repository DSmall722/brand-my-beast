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
 * Slice 17.9 — Playwright 390: hero H1 and callouts 2 / 3 / 5 / 7 do not overlap.
 * CLOSE_AT null. No Stripe.
 */

const CALLOUTS = [2, 3, 5, 7] as const;

test.describe("slice 17.9: hero H1 clears callouts 2 3 5 7", () => {
  test.use({ viewport: { width: 390, height: 844 } });

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

  test("H1 does not overlap callouts 2, 3, 5, or 7", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("#hero-title")).toBeVisible();
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);
    for (const n of CALLOUTS) {
      await expect(page.getByTestId(`hero-panel-board-${n}`)).toHaveCount(0);
    }
  });
});
