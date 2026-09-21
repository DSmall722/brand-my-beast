import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import {
  PANEL_BOARD_MARKS,
  overlayLabelsAreNameOnly,
  panelOverlayLabel,
} from "../src/lib/panel-board";
import {
  VIEW_OWNED_PANEL_IDS,
  doorPackagesAreCabLeaves,
  hotspotsForView,
  truckHotspotsAreValid,
  viewOwningPanel,
} from "../src/lib/truck-views";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

const ROOT = process.cwd();

const LOCKED_LABELS = [
  "(1) Hood",
  "(2) Front fascia",
  "(3) Front bumper",
  "(4) Driver doors",
  "(5) Driver Rear Sail",
  "(6) Driver bed",
  "(7) Passenger doors",
  "(8) Passenger Rear Sail",
  "(9) Passenger bed",
  "(10) Tailgate",
  "(11) Rear bumper",
] as const;

function fillAlpha(value: string): number {
  const modern = value.match(
    /rgba?\(\s*[\d.]+(?:\s+\d*\.?\d+){2}\s*\/\s*([\d.]+)\s*\)/,
  );
  if (modern) return Number(modern[1]);
  const rgba = value.match(
    /rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*([\d.]+))?\s*\)/,
  );
  if (rgba) return rgba[1] == null ? 1 : Number(rgba[1]);
  if (value === "transparent" || value === "none") return 0;
  return 1;
}

async function hoverSeatInterior(page: Page, testId: string) {
  const point = await page.getByTestId(testId).locator("polygon").evaluate((el) => {
    const polygon = el as SVGPolygonElement;
    const svg = polygon.ownerSVGElement;
    if (!svg) throw new Error("polygon has no svg");
    const ctm = polygon.getScreenCTM();
    if (!ctm) throw new Error("no screen CTM");
    const pts = [...polygon.points].map((pt) => ({ x: pt.x, y: pt.y }));
    const cx = pts.reduce((sum, pt) => sum + pt.x, 0) / pts.length;
    const cy = pts.reduce((sum, pt) => sum + pt.y, 0) / pts.length;
    return {
      x: ctm.a * cx + ctm.c * cy + ctm.e,
      y: ctm.b * cx + ctm.d * cy + ctm.f,
    };
  });
  await page.mouse.move(point.x, point.y);
}

test.describe("hybrid panel training UX", () => {
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

  test("overlay labels are (N) Name only on the 11-seat map", () => {
    expect(PANELS).toHaveLength(11);
    expect(PANELS.filter((panel) => isEtchable(panel))).toHaveLength(9);
    expect(PANEL_BOARD_MARKS.map((mark) => panelOverlayLabel(mark))).toEqual([
      ...LOCKED_LABELS,
    ]);
    expect(overlayLabelsAreNameOnly()).toBe(true);
    for (const label of LOCKED_LABELS) {
      expect(label).toMatch(/^\(\d+\) [A-Za-z][A-Za-z ]*$/);
      expect(label).not.toMatch(/\$|opening|wrap-only|etch|intent|buyout/i);
    }
    expect(truckHotspotsAreValid()).toBe(true);
    expect(doorPackagesAreCabLeaves()).toBe(true);
    expect(viewOwningPanel("hood")).toBe("front");
    expect(viewOwningPanel("driver-door")).toBe("driver");
    expect(viewOwningPanel("tailgate")).toBe("rear");
    expect(hotspotsForView("front").map((spot) => spot.panelId)).toEqual([
      ...VIEW_OWNED_PANEL_IDS.front,
    ]);
    expect(hotspotsForView("driver").map((spot) => spot.panelId)).toEqual([
      ...VIEW_OWNED_PANEL_IDS.driver,
    ]);
    expect(hotspotsForView("passenger").map((spot) => spot.panelId)).toEqual([
      ...VIEW_OWNED_PANEL_IDS.passenger,
    ]);
    expect(hotspotsForView("rear").map((spot) => spot.panelId)).toEqual([
      ...VIEW_OWNED_PANEL_IDS.rear,
    ]);
    expect(VIEW_OWNED_PANEL_IDS.driver).toEqual([
      "driver-door",
      "driver-rear-quarter",
      "driver-bed",
    ]);
    expect(VIEW_OWNED_PANEL_IDS.passenger).toEqual([
      "passenger-door",
      "passenger-rear-quarter",
      "passenger-bed",
    ]);
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
    for (const view of ["driver", "passenger", "front", "rear"] as const) {
      expect(
        existsSync(join(ROOT, "public", `truck-view-${view}.jpg`)),
      ).toBe(true);
    }
  });

  test("homepage rest wash and hover fill; labels stay (N) Name", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const seats = page.getByTestId("truck-view-seats");
    await expect(seats).toHaveAttribute("data-baked-marks", "true");
    await expect(seats).toHaveAttribute("data-polygons", "outline");
    await expect(seats).toHaveAttribute("data-training", "hybrid");
    await expect(page.getByTestId("truck-view-svg")).toHaveCount(1);
    await expect(page.getByTestId("view-panel-board-driver")).toHaveCount(0);

    await expect(seats).toHaveAttribute("data-view", "driver");
    await expect(page.getByTestId("truck-view-svg").locator("a")).toHaveCount(3);
    await expect(page.getByTestId("truck-seat-label-driver-door")).toHaveText(
      "(4) Driver doors",
    );
    await expect(page.getByTestId("truck-seat-label-driver-rear-quarter")).toHaveText(
      "(5) Driver Rear Sail",
    );
    await expect(page.getByTestId("truck-seat-label-driver-bed")).toHaveText(
      "(6) Driver bed",
    );
    await expect(page.getByTestId("truck-seat-hood")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-front-fascia")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-front-bumper")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-tailgate")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-rear-bumper")).toHaveCount(0);

    await page.getByTestId("truck-view-passenger").click();
    await expect(seats).toHaveAttribute("data-view", "passenger");
    await expect(page.getByTestId("truck-view-svg").locator("a")).toHaveCount(3);
    await expect(page.getByTestId("truck-seat-label-passenger-door")).toHaveText(
      "(7) Passenger doors",
    );
    await expect(page.getByTestId("truck-seat-label-passenger-rear-quarter")).toHaveText(
      "(8) Passenger Rear Sail",
    );
    await expect(page.getByTestId("truck-seat-label-passenger-bed")).toHaveText(
      "(9) Passenger bed",
    );
    await expect(page.getByTestId("truck-seat-hood")).toHaveCount(0);

    await page.getByTestId("truck-view-front").click();
    const hood = page.getByTestId("truck-seat-hood");
    await expect(hood).toHaveAttribute("data-seat-label", "(1) Hood");
    await expect(page.getByTestId("truck-seat-label-hood")).toHaveText("(1) Hood");
    await expect(page.getByTestId("truck-seat-label-front-fascia")).toHaveText(
      "(2) Front fascia",
    );
    await expect(page.getByTestId("truck-seat-label-front-bumper")).toHaveText(
      "(3) Front bumper",
    );

    const hoodPoly = hood.locator("polygon");
    const restFill = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
    const restStroke = await hoodPoly.evaluate(
      (el) => getComputedStyle(el).stroke,
    );
    expect(fillAlpha(restFill), restFill).toBeGreaterThan(0.05);
    expect(fillAlpha(restFill), restFill).toBeLessThan(0.28);
    expect(restStroke).not.toBe("none");
    expect(restStroke).not.toBe("transparent");

    await hoverSeatInterior(page, "truck-seat-hood");
    await expect
      .poll(async () => {
        const value = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
        return fillAlpha(value);
      })
      .toBeGreaterThanOrEqual(0.35);

    const labels = await page
      .getByTestId("truck-seat-labels")
      .locator("[data-seat-label]")
      .evaluateAll((els) => els.map((el) => el.textContent ?? ""));
    expect(labels).toEqual(["(1) Hood", "(2) Front fascia", "(3) Front bumper"]);
    expect(labels.join(" ")).not.toMatch(/\$|opening|wrap-only|etch lock/i);

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });

  test("/panels/hood photo is the active seat only", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
    await page.evaluate(() => document.fonts.ready);

    const seats = page.getByTestId("truck-view-seats");
    await expect(seats).toHaveAttribute("data-single-seat", "true");
    await expect(seats).toHaveAttribute("data-view", "front");
    await expect(seats).toHaveAttribute("data-polygons", "outline");
    await expect(page.getByTestId("truck-view-toolbar")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-lead")).toHaveCount(0);
    await expect(page.getByTestId("truck-img-board-front")).toBeVisible();
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "data-active",
      "true",
    );
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "data-seat-label",
      "(1) Hood",
    );
    await expect(page.getByTestId("truck-seat-label-hood")).toHaveText("(1) Hood");
    await expect(page.getByTestId("truck-view-svg").locator("a")).toHaveCount(1);
    await expect(page.getByTestId("truck-seat-front-fascia")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-front-bumper")).toHaveCount(0);

    const well = page.getByTestId("truck-view-photo-well");
    await expect(well.getByTestId("stainless-compositor-lead")).toHaveCount(0);
    await expect(well.getByTestId("finish-conditions-lead")).toHaveCount(0);
    await expect(well.getByTestId("dirty-clean-pair-lead")).toHaveCount(0);
    await expect(well.getByTestId("truck-view-lead")).toHaveCount(0);

    const hoodPoly = page.getByTestId("truck-seat-hood").locator("polygon");
    const activeFill = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
    expect(fillAlpha(activeFill), activeFill).toBeGreaterThanOrEqual(0.35);

    await expect(page.getByTestId("seat-lead")).toContainText("$2,500");
    await expect(page.getByTestId("etch-lock-copy")).toContainText(
      "Etch stays locked until buyout",
    );
    await expect(page.getByTestId("intent-only-banner")).toBeVisible();
    await expect(page.getByTestId("adjacent-neighbors")).toBeVisible();
    await expect(page.getByTestId("panel-stats")).toBeVisible();

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });
});
