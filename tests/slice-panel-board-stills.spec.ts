import { existsSync } from "node:fs";
import { join } from "node:path";
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
  panelBoardIsComplete,
  panelBoardMarksForView,
  panelFaceCropsAreDistinct,
} from "../src/lib/panel-board";
import { TRUCK_VIEW_STILLS } from "../src/lib/truck-stills";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Board stills: Cybertruck faces, not one shared Model Y crop.
 * CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();

test.describe("panel board stills map 1–12 onto the truck", () => {
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

  test("layout maps hood…rear fascia and unique face crops", () => {
    expect(panelBoardIsComplete()).toBe(true);
    expect(panelFaceCropsAreDistinct()).toBe(true);
    expect(PANEL_BOARD_MARKS[0]?.panelId).toBe("hood");
    expect(PANEL_BOARD_MARKS[11]?.panelId).toBe("rear-fascia");
    expect(panelBoardMarksForView("side").map((m) => m.panelId)).toEqual(
      expect.arrayContaining([
        "hood",
        "front-fascia",
        "driver-door",
        "driver-bed",
        "driver-rear-quarter",
        "tailgate",
      ]),
    );
    expect(panelBoardMarksForView("front").map((m) => m.panelId)).toEqual(
      expect.arrayContaining([
        "hood",
        "front-fascia",
        "driver-door",
        "passenger-door",
      ]),
    );
    expect(panelBoardMarksForView("rear").map((m) => m.panelId)).toEqual(
      expect.arrayContaining([
        "tailgate",
        "tonneau",
        "rear-fascia",
        "passenger-rear-quarter",
      ]),
    );
    for (const still of Object.values(TRUCK_VIEW_STILLS)) {
      expect(existsSync(join(ROOT, "public", still.replace(/^\//, "")))).toBe(
        true,
      );
    }
  });

  test("homepage cards and views use the matching still", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const faces = new Set<string>();
    for (const panel of PANELS) {
      const mark = PANEL_BOARD_MARKS.find((row) => row.panelId === panel.id);
      const face = page.getByTestId(`panel-face-${panel.id}`);
      await expect(face).toHaveAttribute("data-face-still", mark!.face.still);
      await expect(face).toHaveAttribute(
        "data-face-pos",
        mark!.face.objectPosition,
      );
      faces.add(`${mark!.face.still}:${mark!.face.objectPosition}`);
      const bg = await face.evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg).toMatch(/truck-view-(side|front|rear)\.jpg/);
    }
    expect(faces.size).toBe(12);

    await expect(page.getByTestId("truck-img-board-side")).toHaveAttribute(
      "src",
      TRUCK_VIEW_STILLS.side,
    );
    await page.getByTestId("truck-view-front").click();
    await expect(page.getByTestId("truck-img-board-front")).toHaveAttribute(
      "src",
      TRUCK_VIEW_STILLS.front,
    );
    await expect(page.getByTestId("view-panel-board-front-1")).toHaveAttribute(
      "data-panel-id",
      "hood",
    );
    await expect(page.getByTestId("view-panel-board-front-4")).toHaveAttribute(
      "data-panel-id",
      "passenger-door",
    );
    await page.getByTestId("truck-view-rear").click();
    await expect(page.getByTestId("truck-img-board-rear")).toHaveAttribute(
      "src",
      TRUCK_VIEW_STILLS.rear,
    );
    await expect(page.getByTestId("view-panel-board-rear-9")).toHaveAttribute(
      "data-panel-id",
      "tailgate",
    );
    await expect(page.getByTestId("view-panel-board-rear-12")).toHaveAttribute(
      "data-panel-id",
      "rear-fascia",
    );

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
