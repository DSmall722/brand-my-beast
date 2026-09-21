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
  PANEL_BOARD_MARKS,
  panelBoardMarksForView,
} from "../src/lib/panel-board";
import { TRUCK_VIEWS, type TruckViewId } from "../src/lib/truck-views";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.6 — front / side / rear use the hero number, not a second index.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

test.describe("slice 16.6: views share the hero index", () => {
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

  test("view marks keep hero n, not a 1-based subset index", () => {
    const heroN = new Map(
      PANEL_BOARD_MARKS.map((mark) => [mark.panelId, mark.n]),
    );
    for (const view of TRUCK_VIEWS) {
      const marks = panelBoardMarksForView(view.id);
      expect(marks.length).toBeGreaterThan(0);
      for (const mark of marks) {
        expect(mark.n).toBe(heroN.get(mark.panelId));
      }
    }
    const driver = panelBoardMarksForView("driver");
    expect(driver.some((mark, index) => mark.n !== index + 1)).toBe(true);
  });

  test("homepage board is static; cards and legend keep the hero index", async ({
    page,
  }) => {
    await page.goto("/");
    const views = page.getByTestId("truck-view-seats");
    await expect(views).toBeVisible();
    await expect(views).toHaveAttribute("data-baked-marks", "true");

    for (const row of TRUCK_VIEWS) {
      const view = row.id as TruckViewId;
      await page.getByTestId(`truck-view-${view}`).click();
      await expect(page.getByTestId(`view-panel-board-${view}`)).toHaveCount(0);
      await expect(page.getByTestId(`truck-img-board-${view}`)).toBeVisible();

      const marks = panelBoardMarksForView(view);
      for (const mark of marks) {
        const legend = page.getByTestId(`panel-legend-${mark.n}`);
        await expect(legend).toHaveAttribute("data-panel-id", mark.panelId);
        await expect(legend).toHaveAttribute("data-panel-n", String(mark.n));
        await expect(page.getByTestId(`panel-index-${mark.panelId}`)).toHaveText(
          String(mark.n),
        );
      }
    }

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });
});
