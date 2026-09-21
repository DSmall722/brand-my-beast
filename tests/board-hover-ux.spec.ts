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
  panelOverlayLabel,
} from "../src/lib/panel-board";
import {
  doorPackagesAreCabLeaves,
  hotspotsForView,
  truckHotspotsAreValid,
} from "../src/lib/truck-views";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

const LOCKED_LABELS = [
  "1 HOOD",
  "2 FRONT FASCIA",
  "3 FRONT BUMPER",
  "4 DRIVER DOORS",
  "5 DRIVER SAIL",
  "6 DRIVER BED",
  "7 PASSENGER DOORS",
  "8 PASSENGER SAIL",
  "9 PASSENGER BED",
  "10 TAILGATE",
  "11 REAR BUMPER",
] as const;

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

test.describe("board hover UX: lime outline, fill on hover/focus", () => {
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

  test("openings, etch lock, and overlay labels stay on the 11-seat map", () => {
    expect(PANELS).toHaveLength(11);
    expect(PANELS.filter((panel) => isEtchable(panel))).toHaveLength(9);
    expect(PANELS.find((panel) => panel.id === "front-bumper")?.openingUsd).toBe(
      500,
    );
    expect(PANELS.find((panel) => panel.id === "rear-bumper")?.openingUsd).toBe(
      500,
    );
    expect(PANELS.find((panel) => panel.id === "hood")?.openingUsd).toBe(2500);
    expect(PANELS.find((panel) => panel.id === "front-fascia")?.openingUsd).toBe(
      2000,
    );
    expect(PANELS.find((panel) => panel.id === "driver-door")?.openingUsd).toBe(
      4500,
    );
    expect(
      PANELS.find((panel) => panel.id === "driver-rear-quarter")?.openingUsd,
    ).toBe(1000);
    expect(PANELS.find((panel) => panel.id === "driver-bed")?.openingUsd).toBe(
      2000,
    );
    expect(PANELS.find((panel) => panel.id === "tailgate")?.openingUsd).toBe(
      2500,
    );
    expect(isEtchable(PANELS.find((panel) => panel.id === "front-bumper")!)).toBe(
      false,
    );
    expect(isEtchable(PANELS.find((panel) => panel.id === "rear-bumper")!)).toBe(
      false,
    );
    expect(PANEL_BOARD_MARKS.map((mark) => panelOverlayLabel(mark))).toEqual(
      [...LOCKED_LABELS],
    );
    expect(truckHotspotsAreValid()).toBe(true);
    expect(doorPackagesAreCabLeaves()).toBe(true);
    expect(hotspotsForView("driver").some((spot) => spot.panelId === "driver-door")).toBe(
      true,
    );
    expect(hotspotsForView("rear").map((spot) => spot.panelId)).toEqual([
      "tailgate",
      "rear-bumper",
    ]);
  });

  test("homepage outlines rest empty and fill on hover and keyboard focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const seats = page.getByTestId("truck-view-seats");
    await expect(seats).toHaveAttribute("data-baked-marks", "true");
    await expect(seats).toHaveAttribute("data-polygons", "outline");
    await expect(page.getByTestId("truck-view-svg")).toHaveCount(1);
    await expect(page.getByTestId("view-panel-board-driver")).toHaveCount(0);
    await expect(page.locator(".truck-view-body")).toHaveCount(0);

    const hood = page.getByTestId("truck-seat-hood");
    await page.getByTestId("truck-view-stage").scrollIntoViewIfNeeded();
    await expect(hood).toHaveAttribute("data-seat-label", "1 HOOD");
    await expect(hood).toHaveAttribute("href", "/panels/hood");
    const hoodPoly = hood.locator("polygon");
    const restFill = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
    const restStroke = await hoodPoly.evaluate(
      (el) => getComputedStyle(el).stroke,
    );
    expect(fillAlpha(restFill), restFill).toBeLessThan(0.05);
    expect(restStroke).not.toBe("none");
    expect(restStroke).not.toBe("rgba(0, 0, 0, 0)");
    expect(restStroke).not.toBe("transparent");

    await hoverSeatInterior(page, "truck-seat-hood");
    await expect
      .poll(async () => {
        const value = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
        return fillAlpha(value);
      })
      .toBeGreaterThanOrEqual(0.35);
    const hoverFill = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
    expect(fillAlpha(hoverFill), hoverFill).toBeLessThanOrEqual(0.45);
    await expect(page.getByTestId("truck-seat-caption")).toHaveText("1 HOOD");

    await page.getByTestId("truck-view-lead").hover();
    await expect
      .poll(async () => {
        const value = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
        return fillAlpha(value);
      })
      .toBeLessThan(0.05);

    const fascia = page.getByTestId("truck-seat-front-fascia");
    await fascia.focus();
    await expect
      .poll(async () => {
        const value = await fascia
          .locator("polygon")
          .evaluate((el) => getComputedStyle(el).fill);
        return fillAlpha(value);
      })
      .toBeGreaterThanOrEqual(0.35);
    const focusFill = await fascia
      .locator("polygon")
      .evaluate((el) => getComputedStyle(el).fill);
    expect(fillAlpha(focusFill), focusFill).toBeLessThanOrEqual(0.45);
    await expect(page.getByTestId("truck-seat-caption")).toHaveText(
      "2 FRONT FASCIA",
    );

    await expect(page.getByTestId("truck-seat-front-bumper")).toHaveAttribute(
      "data-seat-label",
      "3 FRONT BUMPER",
    );
    await expect(page.getByTestId("truck-seat-driver-door")).toHaveAttribute(
      "data-seat-label",
      "4 DRIVER DOORS",
    );

    const bumperCard = page.getByTestId("panel-front-bumper");
    await expect(bumperCard).toHaveAttribute("data-seat-label", "3 FRONT BUMPER");
    await expect(page.getByTestId("panel-driver-door")).toHaveAttribute(
      "data-seat-label",
      "4 DRIVER DOORS",
    );
    await bumperCard.scrollIntoViewIfNeeded();
    const restCardBg = await bumperCard.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    await bumperCard.hover();
    const hoverCardBg = await bumperCard.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(fillAlpha(hoverCardBg)).toBeGreaterThan(fillAlpha(restCardBg));

    await page.getByTestId("truck-view-passenger").click();
    await expect(page.getByTestId("truck-seat-passenger-door")).toHaveAttribute(
      "data-seat-label",
      "7 PASSENGER DOORS",
    );
    await page.getByTestId("truck-view-front").click();
    await expect(page.getByTestId("truck-seat-front-bumper")).toBeVisible();
    await page.getByTestId("truck-view-rear").click();
    await expect(page.getByTestId("truck-seat-tailgate")).toHaveAttribute(
      "data-seat-label",
      "10 TAILGATE",
    );
    await expect(page.getByTestId("truck-seat-rear-bumper")).toHaveAttribute(
      "data-seat-label",
      "11 REAR BUMPER",
    );
    await expect(page.getByTestId("truck-view-svg").locator("a")).toHaveCount(2);
    await expect(page.getByTestId("truck-seat-passenger-bed")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-passenger-rear-quarter")).toHaveCount(
      0,
    );
    const rearLabels = await page
      .getByTestId("truck-view-svg")
      .locator("a")
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute("data-seat-label") ?? ""),
      );
    expect(rearLabels).toEqual(["10 TAILGATE", "11 REAR BUMPER"]);
    expect(rearLabels.join(" ")).not.toMatch(/TONNEAU/i);
    const tailPoly = page.getByTestId("truck-seat-tailgate").locator("polygon");
    const restRear = await tailPoly.evaluate((el) => getComputedStyle(el).fill);
    expect(fillAlpha(restRear), restRear).toBeLessThan(0.05);
    await hoverSeatInterior(page, "truck-seat-tailgate");
    await expect
      .poll(async () => {
        const value = await tailPoly.evaluate((el) => getComputedStyle(el).fill);
        return fillAlpha(value);
      })
      .toBeGreaterThanOrEqual(0.35);
    await expect(page.getByTestId("truck-seat-caption")).toHaveText("10 TAILGATE");

    const html = await page.content();
    expect(html).toContain("concept photo");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });

  test("mobile tap toggles fill before navigating", async ({ page }) => {
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (query === "(hover: hover)") {
          return {
            matches: false,
            media: query,
            onchange: null,
            addEventListener() {},
            removeEventListener() {},
            addListener() {},
            removeListener() {},
            dispatchEvent() {
              return false;
            },
          } as MediaQueryList;
        }
        return original(query);
      };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const hood = page.getByTestId("truck-seat-hood");
    await hood.click();
    await expect(page).toHaveURL("/");
    await expect(hood).toHaveAttribute("data-filled", "true");
    const fill = await hood
      .locator("polygon")
      .evaluate((el) => getComputedStyle(el).fill);
    expect(fillAlpha(fill)).toBeGreaterThan(0.1);
    await expect(page.getByTestId("truck-seat-caption")).toHaveText("1 HOOD");
    await hood.click();
    await expect(page).toHaveURL(/\/panels\/hood$/);
  });
});
