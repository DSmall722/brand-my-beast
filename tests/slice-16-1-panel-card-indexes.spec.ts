import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PANEL_BOARD_MARKS } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.1 — homepage panel cards show the same 1–11 index as hero callouts.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

test.describe("slice 16.1: panel card indexes match hero callouts", () => {
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

  test("board marks stay 1 hood … 12 rear fascia", () => {
    expect(PANEL_BOARD_MARKS).toHaveLength(11);
    expect(PANEL_BOARD_MARKS[0]?.panelId).toBe("hood");
    expect(PANEL_BOARD_MARKS[0]?.n).toBe(1);
    expect(PANEL_BOARD_MARKS[2]?.panelId).toBe("front-bumper");
    expect(PANEL_BOARD_MARKS[2]?.n).toBe(3);
    expect(PANEL_BOARD_MARKS[3]?.panelId).toBe("driver-door");
    expect(PANEL_BOARD_MARKS[3]?.n).toBe(4);
    expect(PANEL_BOARD_MARKS[10]?.panelId).toBe("rear-bumper");
    expect(PANEL_BOARD_MARKS[10]?.n).toBe(11);
    for (let i = 0; i < PANELS.length; i += 1) {
      expect(PANEL_BOARD_MARKS[i]?.panelId).toBe(PANELS[i]!.id);
      expect(PANEL_BOARD_MARKS[i]?.n).toBe(i + 1);
    }
  });

  test("homepage cards and hero callouts share the same 1–11 indexes", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    await expect(page.getByTestId("panel-grid")).toBeVisible();
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);

    for (const mark of PANEL_BOARD_MARKS) {
      const card = page.getByTestId(`panel-${mark.panelId}`);
      await expect(card).toHaveAttribute("data-panel-n", String(mark.n));

      const index = page.getByTestId(`panel-index-${mark.panelId}`);
      await expect(index).toBeVisible();
      await expect(index).toHaveText(String(mark.n));
      await expect(index).toHaveAttribute("data-panel-n", String(mark.n));

      const legend = page.getByTestId(`panel-legend-${mark.n}`);
      await expect(legend).toHaveAttribute("data-panel-id", mark.panelId);
      await expect(legend).toHaveAttribute("data-panel-n", String(mark.n));
      await expect(legend).toHaveAttribute("href", `/panels/${mark.panelId}`);
      await expect(page.getByTestId(`panel-link-${mark.panelId}`)).toHaveAttribute(
        "href",
        `/panels/${mark.panelId}`,
      );
    }

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
