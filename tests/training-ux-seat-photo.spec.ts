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
import {
  trainingCopyIsSafe,
  trainingLabelFor,
  trainingRestCaption,
} from "../src/lib/panel-training";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Eleven-panel training UX: clean stills + SVG rest wash / hover fill.
 * Floor $58,000. Buyout $120,000. CLOSE_AT null. No Stripe.
 */

test.describe("training UX: seat photo + lime overlays", () => {
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

  test("training labels stay public-string safe", () => {
    expect(trainingCopyIsSafe()).toBe(true);
    expect(trainingRestCaption(trainingLabelFor("hood"))).toContain("Hood");
    expect(trainingLabelFor("front-bumper").teach).toContain("wrap-only");
  });

  test("hood page is one front still with active lime fill and a clean well", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
    const seats = page.getByTestId("truck-view-seats");
    await expect(seats).toHaveAttribute("data-polygons", "training");
    await expect(seats).toHaveAttribute("data-view", "front");
    await expect(seats).toHaveAttribute("data-locked-view", "front");
    await expect(page.getByTestId("truck-view-toolbar")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-lead")).toHaveCount(0);
    await expect(page.locator(".truck-view-photo")).toHaveAttribute(
      "src",
      "/truck-view-front.jpg",
    );
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "data-active",
      "true",
    );
    const fill = await page
      .locator('[data-testid="truck-seat-hood"] polygon')
      .evaluate((el) => getComputedStyle(el).fill);
    expect(fill).toMatch(/214,\s*255,\s*63|#d6ff3f/i);
    await expect(page.getByTestId("truck-seat-label-hood")).toBeVisible();
    const well = page.getByTestId("seat-stage");
    await expect(well.getByTestId("stainless-compositor-lead")).toHaveCount(0);
    await expect(well.getByTestId("finish-conditions-lead")).toHaveCount(0);
    await expect(well.getByTestId("dirty-clean-pair-lead")).toHaveCount(0);
    await expect(page.getByTestId("seat-facts")).toBeVisible();
    await expect(page.getByTestId("stainless-compositor-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("stainless-compositor-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("etch-lock-copy")).toContainText(
      "Etch stays locked until buyout",
    );
    await expect(page.getByTestId("intent-only-banner")).toBeVisible();
    await expect(page.getByTestId("panel-increment")).toBeVisible();
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
