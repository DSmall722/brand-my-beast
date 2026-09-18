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
import { PANEL_BOARD_MARKS } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.5 — Playwright 1280px: all twelve hero numbers present in the DOM.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

test.describe("slice 16.5: 1280px all twelve numbers in the DOM", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

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

  test("hero board has numbers 1–12 in the DOM", async ({ page }) => {
    await page.goto("/");
    const board = page.getByTestId("hero-panel-board");
    await expect(board).toBeAttached();

    for (const mark of PANEL_BOARD_MARKS) {
      const callout = page.getByTestId(`hero-panel-board-${mark.n}`);
      await expect(callout).toBeAttached();
      await expect(callout).toHaveAttribute("data-panel-n", String(mark.n));
      await expect(callout).toHaveAttribute("data-panel-id", mark.panelId);
      await expect(callout.locator(".panel-board-callout-n")).toHaveText(
        String(mark.n),
      );
    }

    await expect(board.locator("[data-panel-n]")).toHaveCount(12);

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });
});
