import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  compositeOver,
  contrastRatio,
} from "../src/lib/contrast-ratio";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.39 — number badge vs stainless still meets 4.5:1.
 * CLOSE_AT null. No Stripe.
 */

test.describe("slice 16.39: callout contrast on stainless", () => {
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

  test("active training ink on lime is at least 4.5:1", async ({ page }) => {
    const ink: [number, number, number] = [18, 22, 10];
    const lime: [number, number, number] = [214, 255, 63];
    const plate = compositeOver([ink[0], ink[1], ink[2], 1], lime);
    expect(contrastRatio(plate, lime)).toBeGreaterThanOrEqual(4.5);

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
    const fill = await page
      .locator('[data-testid="truck-seat-hood"] polygon')
      .evaluate((el) => getComputedStyle(el).fill);
    expect(fill).toContain("214, 255, 63");
  });
});
