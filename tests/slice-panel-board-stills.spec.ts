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

    const byId = Object.fromEntries(
      PANEL_BOARD_MARKS.map((mark) => [mark.panelId, mark]),
    );
    const side = (id: string) => {
      const pct = byId[id]?.views.side;
      if (!pct) throw new Error(`missing side mark ${id}`);
      return pct;
    };
    const front = (id: string) => {
      const pct = byId[id]?.views.front;
      if (!pct) throw new Error(`missing front mark ${id}`);
      return pct;
    };
    const rear = (id: string) => {
      const pct = byId[id]?.views.rear;
      if (!pct) throw new Error(`missing rear mark ${id}`);
      return pct;
    };

    // Side = driver ¾-rear: nose left, tail right. Hood is not the door.
    expect(side("front-fascia").x).toBeLessThan(side("hood").x);
    expect(side("hood").x).toBeLessThan(side("driver-door").x);
    expect(side("hood").x).toBeLessThan(22);
    expect(side("driver-door").x).toBeLessThan(side("driver-bed").x);
    expect(side("driver-bed").x).toBeLessThan(side("driver-rear-quarter").x);
    expect(side("driver-rear-quarter").x).toBeLessThan(side("tailgate").x);
    expect(side("roof").y).toBeLessThan(side("tonneau").y);
    expect(side("tonneau").y).toBeLessThan(side("driver-bed").y);

    // Front = passenger-front: driver far-left, passenger near-right.
    expect(front("driver-door").x).toBeLessThan(front("hood").x);
    expect(front("hood").x).toBeLessThan(front("passenger-door").x);
    expect(front("front-fascia").y).toBeGreaterThan(front("hood").y);

    // Rear = passenger-rear: tail left, passenger side right.
    expect(rear("driver-rear-quarter").x).toBeLessThan(rear("tailgate").x);
    expect(rear("tailgate").x).toBeLessThan(rear("passenger-rear-quarter").x);
    expect(rear("passenger-rear-quarter").x).toBeLessThan(rear("passenger-bed").x);
    expect(rear("rear-fascia").y).toBeGreaterThan(rear("tailgate").y);
    expect(rear("roof").y).toBeLessThan(rear("tonneau").y);
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
    await expect(page.getByTestId("view-panel-board-front-1")).toHaveCount(0);
    await expect(page.getByTestId("view-panel-board-front-4")).toHaveCount(0);
    await expect(page.getByTestId("panel-index-hood")).toHaveText("1");
    await expect(page.getByTestId("panel-index-passenger-door")).toHaveText("4");
    await page.getByTestId("truck-view-rear").click();
    await expect(page.getByTestId("truck-img-board-rear")).toHaveAttribute(
      "src",
      TRUCK_VIEW_STILLS.rear,
    );
    await expect(page.getByTestId("view-panel-board-rear-9")).toHaveCount(0);
    await expect(page.getByTestId("view-panel-board-rear-12")).toHaveCount(0);
    await expect(page.getByTestId("panel-index-tailgate")).toHaveText("9");
    await expect(page.getByTestId("panel-index-rear-fascia")).toHaveText("12");

    await page.getByTestId("truck-view-side").click();
    const fit = await page
      .locator(".truck-view-photo")
      .evaluate((el) => getComputedStyle(el).objectFit);
    expect(fit).toBe("contain");

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
