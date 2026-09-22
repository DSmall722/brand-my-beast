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
 * Slice 17.3 — legend + aria use buyer seat words (20.6 sentence).
 * Occupied hood (16.48 seed) may say held seat. An empty hotspot still says open seat.
 * Drop Raw 30X / Not a 360 from visible UI. CLOSE_AT null. No Stripe.
 */

test.describe("slice 17.3: open-seat legend drops 30X", () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

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

  test("homepage legend and aria use buyer seat words", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("truck-view-legend")).toHaveCount(0);
    const empty = page.getByTestId("truck-seat-hood");
    await expect(empty).toBeVisible();
    await expect(empty).toHaveAttribute("aria-label", /open seat$/);
    const emptyLabel = (await empty.getAttribute("aria-label")) ?? "";
    expect(emptyLabel).not.toMatch(/30X|Not a 360/);
    await page.goto("/panels/hood");
    const hood = page.getByTestId("truck-seat-hood");
    const hoodOccupied = await hood.getAttribute("data-occupied");
    if (hoodOccupied === "true") {
      await expect(hood).toHaveAttribute("aria-label", /held seat$/);
    } else {
      await expect(hood).toHaveAttribute("aria-label", /open seat$/);
    }
    const hoodLabel = (await hood.getAttribute("aria-label")) ?? "";
    expect(hoodLabel).not.toMatch(/30X|Not a 360/);
    const html = await page.content();
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("Raw 30X");
    expect(html).not.toContain("Not a 360");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
