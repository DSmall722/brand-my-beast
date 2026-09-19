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
import { TRUCK_VIEWS_LEAD, truckViewsCopyIsSafe } from "../src/lib/truck-views";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 17.1 — TRUCK_VIEWS_LEAD is a buyer sentence.
 * No prototype / hotspot / 30X. Floor and buyout from formatUsd.
 * CLOSE_AT null. No Stripe.
 */

test.describe("slice 17.1: truck views lead is a buyer sentence", () => {
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

  test("lead has floor and buyout and no prototype jargon", () => {
    expect(TRUCK_VIEWS_LEAD).toContain(formatUsd(FLOOR_USD));
    expect(TRUCK_VIEWS_LEAD).toContain(formatUsd(GOAL_USD));
    expect(TRUCK_VIEWS_LEAD.toLowerCase()).not.toContain("prototype");
    expect(TRUCK_VIEWS_LEAD.toLowerCase()).not.toContain("hotspot");
    expect(TRUCK_VIEWS_LEAD.toLowerCase()).not.toContain("30x");
    expect(TRUCK_VIEWS_LEAD.toLowerCase()).not.toMatch(/\blease\b/);
    expect(TRUCK_VIEWS_LEAD).not.toContain("CLOSE_AT");
    expect(truckViewsCopyIsSafe()).toBe(true);
  });

  test("homepage lead matches the buyer sentence", async ({ page }) => {
    await page.goto("/");
    const lead = page.getByTestId("truck-view-lead");
    await expect(lead).toContainText(formatUsd(FLOOR_USD));
    await expect(lead).toContainText(formatUsd(GOAL_USD));
    await expect(lead).not.toContainText("prototype");
    await expect(lead).not.toContainText("hotspot");
    await expect(lead).not.toContainText("30X");
    const html = await page.content();
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
