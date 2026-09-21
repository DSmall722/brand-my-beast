import { existsSync, readFileSync } from "node:fs";
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

test.describe("panel board stills map 1–11 onto the truck", () => {
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

  test("rear still is Stephen Leonardi Pexels 29278630", () => {
    const bytes = readFileSync(join(ROOT, "public", "truck-view-rear.jpg"));
    const text = bytes.toString("latin1");
    expect(text).toContain("Stephen Leonardi");
    expect(text).toContain(
      "https://www.pexels.com/photo/futuristic-truck-on-a-forest-road-in-autumn-29278630/",
    );
    expect(text).not.toContain("James Collington");
    expect(text).not.toContain("30073773");
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("layout maps hood…rear bumper and unique face crops", () => {
    expect(panelBoardIsComplete()).toBe(true);
    expect(panelFaceCropsAreDistinct()).toBe(true);
    expect(PANEL_BOARD_MARKS[0]?.panelId).toBe("hood");
    expect(PANEL_BOARD_MARKS[10]?.panelId).toBe("rear-bumper");
    expect(panelBoardMarksForView("driver").map((m) => m.panelId)).toEqual(
      expect.arrayContaining([
        "hood",
        "front-fascia",
        "driver-door",
        "driver-bed",
        "driver-rear-quarter",
        "tailgate",
      ]),
    );
    expect(panelBoardMarksForView("passenger").map((m) => m.panelId)).toEqual(
      expect.arrayContaining([
        "passenger-door",
        "passenger-bed",
        "passenger-rear-quarter",
      ]),
    );
    expect(panelBoardMarksForView("front").map((m) => m.panelId)).toEqual(
      expect.arrayContaining(["hood", "front-fascia", "front-bumper"]),
    );
    expect(panelBoardMarksForView("rear").map((m) => m.panelId)).toEqual([
      "tailgate",
      "rear-bumper",
    ]);
    for (const still of Object.values(TRUCK_VIEW_STILLS)) {
      expect(existsSync(join(ROOT, "public", still.replace(/^\//, "")))).toBe(
        true,
      );
    }

    const byId = Object.fromEntries(
      PANEL_BOARD_MARKS.map((mark) => [mark.panelId, mark]),
    );
    const driver = (id: string) => {
      const pct = byId[id]?.views.driver;
      if (!pct) throw new Error(`missing driver mark ${id}`);
      return pct;
    };
    const passenger = (id: string) => {
      const pct = byId[id]?.views.passenger;
      if (!pct) throw new Error(`missing passenger mark ${id}`);
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

    // Driver profile: nose left, tail right.
    expect(driver("front-fascia").x).toBeLessThan(driver("hood").x);
    expect(driver("hood").x).toBeLessThan(driver("driver-door").x);
    expect(driver("driver-door").x).toBeLessThan(driver("driver-bed").x);
    expect(driver("driver-bed").x).toBeLessThan(driver("driver-rear-quarter").x);
    expect(driver("driver-rear-quarter").x).toBeLessThan(driver("tailgate").x);
    expect(driver("front-bumper").y).toBeGreaterThan(driver("front-fascia").y);
    expect(driver("rear-bumper").y).toBeGreaterThan(driver("tailgate").y);

    // Passenger ¾: nose right, tail left. 4 / 6 / 8 on near steel.
    expect(passenger("passenger-rear-quarter").x).toBeLessThan(
      passenger("passenger-bed").x,
    );
    expect(passenger("passenger-bed").x).toBeLessThan(passenger("passenger-door").x);
    expect(passenger("passenger-door").x).toBeLessThan(passenger("hood").x);

    // Front head-on.
    expect(front("front-fascia").y).toBeGreaterThan(front("hood").y);
    expect(front("front-bumper").y).toBeGreaterThan(front("front-fascia").y);

    // Rear = straight-on forest road: tailgate above bumper. No tonneau.
    expect(rear("rear-bumper").y).toBeGreaterThan(rear("tailgate").y);
    expect(byId["passenger-bed"]?.views.rear).toBeUndefined();
    expect(byId["passenger-rear-quarter"]?.views.rear).toBeUndefined();
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
      expect(bg).toMatch(/truck-view-(driver|passenger|front|rear)\.jpg/);
    }
    expect(faces.size).toBe(11);

    await expect(page.getByTestId("truck-img-board-driver")).toHaveAttribute(
      "src",
      TRUCK_VIEW_STILLS.driver,
    );
    await page.getByTestId("truck-view-passenger").click();
    await expect(page.getByTestId("truck-img-board-passenger")).toHaveAttribute(
      "src",
      TRUCK_VIEW_STILLS.passenger,
    );
    await page.getByTestId("truck-view-front").click();
    await expect(page.getByTestId("truck-img-board-front")).toHaveAttribute(
      "src",
      TRUCK_VIEW_STILLS.front,
    );
    await expect(page.getByTestId("view-panel-board-front-1")).toHaveCount(0);
    await expect(page.getByTestId("view-panel-board-front-4")).toHaveCount(0);
    await expect(page.getByTestId("panel-index-hood")).toHaveText("1");
    await expect(page.getByTestId("panel-index-passenger-door")).toHaveText("7");
    await page.getByTestId("truck-view-rear").click();
    await expect(page.getByTestId("truck-img-board-rear")).toHaveAttribute(
      "src",
      TRUCK_VIEW_STILLS.rear,
    );
    await expect(page.getByTestId("view-panel-board-rear-9")).toHaveCount(0);
    await expect(page.getByTestId("view-panel-board-rear-12")).toHaveCount(0);
    await expect(page.getByTestId("panel-index-tailgate")).toHaveText("10");
    await expect(page.getByTestId("panel-index-rear-bumper")).toHaveText("11");

    await page.getByTestId("truck-view-driver").click();
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
