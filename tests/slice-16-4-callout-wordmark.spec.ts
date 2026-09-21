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
 * Slice 16.4 — Playwright 390px: numbers 1, 3, 5, 9 visible
 * and not clipped by the wordmark.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

const VISIBLE_NS = [1, 3, 5, 9] as const;

function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

test.describe("slice 16.4: 390px callouts clear the wordmark", () => {
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

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("numbers 1, 3, 5, 9 are on screen and clear of the wordmark", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const viewport = page.viewportSize();
    if (!viewport) throw new Error("viewport missing");

    const wordmark = page.getByTestId("brand-wordmark");
    await expect(wordmark).toBeVisible();
    const wordBox = await wordmark.boundingBox();
    if (!wordBox) throw new Error("wordmark box missing");

    for (const n of VISIBLE_NS) {
      const mark = PANEL_BOARD_MARKS[n - 1];
      expect(mark?.n).toBe(n);
      const callout = page.getByTestId(`panel-legend-${n}`);
      await expect(callout).toBeVisible();
      await expect(callout).toHaveAttribute("data-panel-n", String(n));

      const box = await callout.boundingBox();
      if (!box) throw new Error(`legend ${n} box missing`);

      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(boxesOverlap(box, wordBox)).toBe(false);
    }

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });
});
