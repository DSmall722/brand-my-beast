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
import {
  PANEL_BOARD_MARKS,
  panelLegendLabel,
} from "../src/lib/panel-board";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.3 — number map legend under the hero.
 * Labels are `1 Hood` … `11 Rear bumper` from PANELS only.
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

test.describe("slice 16.3: number map legend under the hero", () => {
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

  test("legend labels are PANELS names, 1 Hood through 11 Rear bumper", () => {
    expect(PANEL_BOARD_MARKS).toHaveLength(PANELS.length);
    expect(panelLegendLabel(PANEL_BOARD_MARKS[0]!)).toBe("1 Hood");
    expect(panelLegendLabel(PANEL_BOARD_MARKS[10]!)).toBe("11 Rear bumper");
    for (let i = 0; i < PANELS.length; i += 1) {
      const mark = PANEL_BOARD_MARKS[i]!;
      expect(mark.panelId).toBe(PANELS[i]!.id);
      expect(mark.name).toBe(PANELS[i]!.name);
      expect(panelLegendLabel(mark)).toBe(`${i + 1} ${PANELS[i]!.name}`);
    }
  });

  test("homepage legend sits under the hero and matches PANELS", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);

    const legend = page.getByTestId("panel-number-legend");
    await expect(legend).toBeVisible();
    const heroBox = await page.locator("section.hero").boundingBox();
    const legendBox = await legend.boundingBox();
    expect(heroBox).toBeTruthy();
    expect(legendBox).toBeTruthy();
    expect(legendBox!.y).toBeGreaterThanOrEqual(heroBox!.y + heroBox!.height - 1);

    await expect(page.getByTestId("panel-legend-1")).toHaveText("1 Hood");
    await expect(page.getByTestId("panel-legend-11")).toHaveText(
      "11 Rear bumper",
    );

    for (const mark of PANEL_BOARD_MARKS) {
      const item = page.getByTestId(`panel-legend-${mark.n}`);
      await expect(item).toHaveText(panelLegendLabel(mark));
      await expect(item).toHaveAttribute("href", `/panels/${mark.panelId}`);
      await expect(item).toHaveAttribute("data-panel-id", mark.panelId);
    }

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
