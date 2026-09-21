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
 * Slice 16.38 — prefers-reduced-motion: seat hit target stays still.
 * Labels are baked into the TRACE AID JPEG. CLOSE_AT null. No Stripe.
 */

test.describe("slice 16.38: reduced motion keeps callouts still", () => {
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

  test("active seat stays visible with no animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
    const seat = page.getByTestId("truck-seat-hood");
    await expect(seat).toBeVisible();
    await expect(seat).toHaveAttribute("data-seat-label", "(1) Hood");
    await expect(page.getByTestId("truck-seat-label-hood")).toHaveCount(0);
    const motion = await seat.locator("polygon").evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        animationName: style.animationName,
        transitionProperty: style.transitionProperty,
      };
    });
    expect(motion.animationName === "none" || motion.animationName === "").toBe(
      true,
    );
    expect(
      motion.transitionProperty === "none" || motion.transitionProperty === "",
    ).toBe(true);
  });
});
