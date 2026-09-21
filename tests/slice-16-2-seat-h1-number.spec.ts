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
  panelBoardMarkFor,
  panelSeatH1,
} from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.2 — seat page H1 includes the board number (`4 · Driver doors`).
 * CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

test.describe("slice 16.2: seat page H1 includes board number", () => {
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

  test("panelSeatH1 matches board marks (4 · Driver doors)", () => {
    const driverDoor = PANELS.find((row) => row.id === "driver-door");
    expect(driverDoor).toBeTruthy();
    expect(panelSeatH1(driverDoor!)).toBe("4 · Driver doors");
    expect(panelBoardMarkFor("driver-door").n).toBe(4);
    expect(panelSeatH1(PANELS[0]!)).toBe("1 · Hood");
    expect(panelSeatH1(PANELS[10]!)).toBe("11 · Rear bumper");
    for (const mark of PANEL_BOARD_MARKS) {
      const panel = PANELS.find((row) => row.id === mark.panelId)!;
      expect(panelSeatH1(panel)).toBe(`${mark.n} · ${panel.name}`);
    }
  });

  test("seat pages render numbered H1 matching hero callouts", async ({
    page,
  }) => {
    for (const mark of PANEL_BOARD_MARKS) {
      await page.goto(`/panels/${mark.panelId}`);
      const h1 = page.getByTestId("panel-seat-h1");
      await expect(h1).toBeVisible();
      await expect(h1).toHaveText(`${mark.n} · ${mark.name}`);
      await expect(h1).toHaveAttribute("data-panel-n", String(mark.n));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        `${mark.n} · ${mark.name}`,
      );
    }

    await page.goto("/panels/driver-door");
    await expect(page.getByTestId("panel-seat-h1")).toHaveText(
      "4 · Driver doors",
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
