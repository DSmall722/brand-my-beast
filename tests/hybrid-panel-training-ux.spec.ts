import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  DRIVER_BOARD_STILL,
  PASSENGER_BOARD_STILL,
  TRACE_AID_STILL,
} from "../src/lib/truck-stills";
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
  "(2) Front Fascia",
  "(3) Front bumper",
  "(4) Driver Side Doors",
  "(5) Driver Rear Sail",
  "(6) Driver Side Bed",
  "(7) Passenger Side Doors",
  "(8) Passenger Rear Sail",
  "(9) Passenger Side Bed",
  "(10) Tailgate",
  "(11) Rear bumper",
] as const;

function jpegSize(buf: Buffer): { width: number; height: number } {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error("not a jpeg");
  }
  let i = 2;
  while (i + 8 < buf.length) {
    if (buf[i] !== 0xff) throw new Error("jpeg marker missing");
    const marker = buf[i + 1] ?? 0;
    if (marker === 0xd8 || marker === 0xd9) {
      i += 2;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const len = buf.readUInt16BE(i + 2);
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return {
        height: buf.readUInt16BE(i + 5),
        width: buf.readUInt16BE(i + 7),
      };
    }
    i += 2 + len;
  }
  throw new Error("no SOF");
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

function strokeIsOff(value: string): boolean {
  return value === "none" || value === "transparent" || fillAlpha(value) === 0;
}

async function restPaint(page: Page, testId: string) {
  return page.getByTestId(testId).locator("polygon").evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      fill: style.fill,
      fillOpacity: style.fillOpacity,
      stroke: style.stroke,
      strokeOpacity: style.strokeOpacity,
      strokeWidth: style.strokeWidth,
    };
  });
}

async function assertRestHitOnly(page: Page, testId: string) {
  const paint = await restPaint(page, testId);
  const none = paint.fill === "none" || paint.fill === "transparent";
  expect(
    none || fillAlpha(paint.fill) < 0.05,
    `${testId} rest fill ${paint.fill}`,
  ).toBe(true);
  if (!none) {
    expect(Number(paint.fillOpacity), `${testId} rest fill-opacity`).toBeLessThan(
      0.05,
    );
  }
  expect(
    strokeIsOff(paint.stroke),
    `${testId} rest stroke ${paint.stroke}`,
  ).toBe(true);
  expect(Number.parseFloat(paint.strokeWidth), `${testId} rest stroke-width`).toBe(
    0,
  );
}

async function parkPointer(page: Page) {
  await page.mouse.move(8, 8);
}

async function hoverSeatInterior(page: Page, testId: string) {
  const seat = page.getByTestId(testId);
  await seat.scrollIntoViewIfNeeded();
  await expect(seat).toBeVisible();
  await seat.hover({ force: true });
}

async function seatAtPercent(
  page: Page,
  xPct: number,
  yPct: number,
): Promise<string | null> {
  const photo = page.locator(".truck-view-photo");
  await photo.scrollIntoViewIfNeeded();
  const box = await photo.boundingBox();
  if (!box) throw new Error("board photo box missing");
  const x = box.x + (box.width * xPct) / 100;
  const y = box.y + (box.height * yPct) / 100;
  await page.mouse.move(x, y);
  return page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    const marked = el?.closest("[data-seat-id]");
    const seatId = marked?.getAttribute("data-seat-id");
    return seatId ? `truck-seat-${seatId}` : null;
  }, { x, y });
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

  test("board stills are TRACE AID lime flats", () => {
    const expected = {
      driver: DRIVER_BOARD_STILL,
      passenger: PASSENGER_BOARD_STILL,
      front: TRACE_AID_STILL,
      rear: TRACE_AID_STILL,
    } as const;
    for (const view of ["driver", "passenger", "front", "rear"] as const) {
      const path = join(ROOT, "public", `truck-view-${view}.jpg`);
      expect(existsSync(path)).toBe(true);
      const bytes = readFileSync(path);
      expect(jpegSize(bytes)).toEqual({
        width: expected[view].width,
        height: expected[view].height,
      });
      expect(bytes.byteLength).toBeGreaterThan(350_000);
    }
  });

  test("homepage rest is hit-only; name chips; no silhouette fill", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const seats = page.getByTestId("truck-view-seats");
    await expect(seats).toHaveAttribute("data-baked-marks", "true");
    await expect(seats).toHaveAttribute("data-polygons", "outline");
    await expect(seats).toHaveAttribute("data-name-chips", "true");
    await expect(seats).toHaveAttribute("data-training", "hybrid");
    await expect(page.getByTestId("truck-view-svg")).toHaveCount(1);
    await expect(page.getByTestId("view-panel-board-driver")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-labels")).toHaveCount(0);

    await expect(seats).toHaveAttribute("data-view", "front");
    await expect(page.getByTestId("truck-view-svg").locator("a[data-testid^='truck-seat-']")).toHaveCount(3);
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "data-seat-label",
      "(1) Hood",
    );
    await expect(page.getByTestId("truck-seat-front-fascia")).toHaveAttribute(
      "data-seat-label",
      "(2) Front Fascia",
    );
    await expect(page.getByTestId("truck-seat-front-bumper")).toHaveAttribute(
      "data-seat-label",
      "(3) Front bumper",
    );
    await expect(page.getByTestId("truck-seat-label-hood")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-driver-door")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-driver-bed")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-tailgate")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-rear-bumper")).toHaveCount(0);

    const photo = page.locator(".truck-view-photo");
    const dims = await photo.evaluate((el) => {
      const img = el as HTMLImageElement;
      return { w: img.naturalWidth, h: img.naturalHeight };
    });
    expect(dims).toEqual({
      w: TRACE_AID_STILL.width,
      h: TRACE_AID_STILL.height,
    });

    await page.getByTestId("truck-view-driver").click();
    await expect(seats).toHaveAttribute("data-view", "driver");
    await expect(page.getByTestId("truck-view-svg").locator("a[data-testid^='truck-seat-']")).toHaveCount(3);
    await expect(page.getByTestId("truck-seat-driver-door")).toHaveAttribute(
      "data-seat-label",
      "(4) Driver Side Doors",
    );
    await expect(page.getByTestId("truck-seat-driver-rear-quarter")).toHaveAttribute(
      "data-seat-label",
      "(5) Driver Rear Sail",
    );
    await expect(page.getByTestId("truck-seat-driver-bed")).toHaveAttribute(
      "data-seat-label",
      "(6) Driver Side Bed",
    );
    await expect(page.getByTestId("truck-seat-label-driver-door")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-hood")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-front-fascia")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-front-bumper")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-tailgate")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-rear-bumper")).toHaveCount(0);

    const driverDims = await photo.evaluate((el) => {
      const img = el as HTMLImageElement;
      return { w: img.naturalWidth, h: img.naturalHeight };
    });
    expect(driverDims).toEqual({
      w: DRIVER_BOARD_STILL.width,
      h: DRIVER_BOARD_STILL.height,
    });

    await page.getByTestId("truck-view-passenger").click();
    await expect(seats).toHaveAttribute("data-view", "passenger");
    await expect(page.getByTestId("truck-view-svg").locator("a[data-testid^='truck-seat-']")).toHaveCount(3);
    await expect(page.getByTestId("truck-seat-passenger-door")).toHaveAttribute(
      "data-seat-label",
      "(7) Passenger Side Doors",
    );
    await expect(page.getByTestId("truck-seat-passenger-rear-quarter")).toHaveAttribute(
      "data-seat-label",
      "(8) Passenger Rear Sail",
    );
    await expect(page.getByTestId("truck-seat-passenger-bed")).toHaveAttribute(
      "data-seat-label",
      "(9) Passenger Side Bed",
    );
    await expect(page.getByTestId("truck-seat-hood")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-label-passenger-door")).toHaveCount(
      0,
    );
    await expect
      .poll(async () =>
        photo.evaluate((el) => (el as HTMLImageElement).naturalWidth),
      )
      .toBe(PASSENGER_BOARD_STILL.width);

    await page.getByTestId("truck-view-front").click();
    const hood = page.getByTestId("truck-seat-hood");
    await expect(hood).toHaveAttribute("data-seat-label", "(1) Hood");
    await expect(page.getByTestId("truck-seat-front-fascia")).toHaveAttribute(
      "data-seat-label",
      "(2) Front Fascia",
    );
    await expect(page.getByTestId("truck-seat-front-bumper")).toHaveAttribute(
      "data-seat-label",
      "(3) Front bumper",
    );
    await expect(page.getByTestId("truck-seat-label-hood")).toHaveCount(0);

    const cameras = [
      { tab: "truck-view-driver", seat: "truck-seat-driver-door" },
      { tab: "truck-view-passenger", seat: "truck-seat-passenger-door" },
      { tab: "truck-view-front", seat: "truck-seat-hood" },
      { tab: "truck-view-rear", seat: "truck-seat-tailgate" },
    ] as const;
    for (const camera of cameras) {
      await page.getByTestId(camera.tab).click();
      await parkPointer(page);
      await assertRestHitOnly(page, camera.seat);
    }

    await page.getByTestId("truck-view-front").click();
    await parkPointer(page);
    const hoodPoly = hood.locator("polygon");
    await hoverSeatInterior(page, "truck-seat-hood");
    await expect
      .poll(async () => {
        const value = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
        return fillAlpha(value);
      })
      .toBe(0);
    await expect
      .poll(async () =>
        hoodPoly.evaluate((el) => getComputedStyle(el).strokeWidth),
      )
      .toBe("0px");
    const hoodChip = page.getByTestId("truck-name-chip-hood");
    await expect(hoodChip).toHaveCount(1);
    const hoodChipBox = await hoodChip.evaluate((el) => {
      const rect = el as SVGRectElement;
      return {
        w: rect.width.baseVal.value,
        h: rect.height.baseVal.value,
        stroke: getComputedStyle(el).stroke,
      };
    });
    expect(hoodChipBox.w).toBeGreaterThan(12);
    expect(hoodChipBox.h).toBeGreaterThan(10);
    expect(hoodChipBox.w).toBeLessThan(26);
    expect(hoodChipBox.h).toBeLessThan(16);
    expect(hoodChipBox.stroke).toMatch(/214,\s*255,\s*63|rgb\(214 255 63/);

    await page.getByTestId("truck-view-driver").click();
    await expect(seats).toHaveAttribute("data-view", "driver");
    await parkPointer(page);
    await assertRestHitOnly(page, "truck-seat-driver-door");
    await hoverSeatInterior(page, "truck-seat-driver-door");
    await expect
      .poll(async () => {
        const value = await page
          .getByTestId("truck-seat-driver-door")
          .locator("polygon")
          .evaluate((el) => getComputedStyle(el).fill);
        return fillAlpha(value);
      })
      .toBe(0);
    await expect(page.getByTestId("truck-name-chip-driver-door")).toHaveCount(1);
    await expect(page.getByTestId("truck-name-chip-driver-rear-quarter")).toHaveCount(1);
    await expect(page.getByTestId("truck-name-chip-driver-bed")).toHaveCount(1);

    await page.getByTestId("truck-view-passenger").click();
    await expect(seats).toHaveAttribute("data-view", "passenger");
    await parkPointer(page);
    await assertRestHitOnly(page, "truck-seat-passenger-door");
    await hoverSeatInterior(page, "truck-seat-passenger-door");
    await expect
      .poll(async () => {
        const value = await page
          .getByTestId("truck-seat-passenger-door")
          .locator("polygon")
          .evaluate((el) => getComputedStyle(el).fill);
        return fillAlpha(value);
      })
      .toBe(0);
    await expect(page.getByTestId("truck-name-chip-passenger-door")).toHaveCount(1);
    await expect(page.getByTestId("truck-name-chip-passenger-rear-quarter")).toHaveCount(1);
    await expect(page.getByTestId("truck-name-chip-passenger-bed")).toHaveCount(1);

    await page.getByTestId("truck-view-rear").click();
    await expect(page.getByTestId("truck-name-chip-tailgate")).toHaveCount(1);
    await expect(page.getByTestId("truck-name-chip-rear-bumper")).toHaveCount(1);
    await expect(page.locator(".truck-view-svg polygon")).toHaveCount(2);
    const rearStrokes = await page.locator(".truck-view-svg polygon").evaluateAll((nodes) =>
      nodes.map((el) => getComputedStyle(el).strokeWidth),
    );
    expect(rearStrokes.every((width) => width === "0px")).toBe(true);

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });

  test("v9 side hits land on doors, sail, and bed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const probes = [
      { tab: "truck-view-driver", x: 40, y: 52, seat: "truck-seat-driver-door" },
      { tab: "truck-view-driver", x: 64, y: 42, seat: "truck-seat-driver-rear-quarter" },
      { tab: "truck-view-driver", x: 82, y: 52, seat: "truck-seat-driver-bed" },
      { tab: "truck-view-driver", x: 66, y: 55, seat: null },
      { tab: "truck-view-driver", x: 12, y: 50, seat: null },
      { tab: "truck-view-passenger", x: 38, y: 58, seat: "truck-seat-passenger-door" },
      { tab: "truck-view-passenger", x: 18, y: 42, seat: "truck-seat-passenger-rear-quarter" },
      { tab: "truck-view-passenger", x: 20, y: 55, seat: "truck-seat-passenger-bed" },
      { tab: "truck-view-passenger", x: 12, y: 62, seat: null },
      { tab: "truck-view-passenger", x: 70, y: 55, seat: null },
    ] as const;

    for (const probe of probes) {
      await page.getByTestId(probe.tab).click();
      await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
        "data-view",
        probe.tab.replace("truck-view-", ""),
      );
      const hit = await seatAtPercent(page, probe.x, probe.y);
      expect(hit, `${probe.tab} ${probe.x},${probe.y}`).toBe(probe.seat);
    }

    await page.getByTestId("truck-view-driver").click();
    await parkPointer(page);
    await assertRestHitOnly(page, "truck-seat-driver-door");
    await page.getByTestId("truck-view-passenger").click();
    await parkPointer(page);
    await assertRestHitOnly(page, "truck-seat-passenger-door");
  });

  test("/panels/hood photo is the active seat only", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/panels/hood");
    await page.evaluate(() => document.fonts.ready);

    const seats = page.getByTestId("truck-view-seats");
    await expect(seats).toHaveAttribute("data-single-seat", "true");
    await expect(seats).toHaveAttribute("data-view", "front");
    await expect(seats).toHaveAttribute("data-polygons", "hidden");
    await expect(seats).toHaveAttribute("data-name-chips", "false");
    await expect(page.getByTestId("truck-name-chip-hood")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-toolbar")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-lead")).toHaveCount(0);
    await expect(page.getByTestId("truck-img-board-front")).toBeVisible();
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "data-active",
      "false",
    );
    await expect(page.getByTestId("truck-seat-hood")).toHaveAttribute(
      "data-seat-label",
      "(1) Hood",
    );
    await expect(page.getByTestId("truck-seat-label-hood")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-labels")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-svg").locator("a[data-testid^='truck-seat-']")).toHaveCount(1);
    await expect(page.getByTestId("truck-seat-front-fascia")).toHaveCount(0);
    await expect(page.getByTestId("truck-seat-front-bumper")).toHaveCount(0);

    const well = page.getByTestId("truck-view-photo-well");
    await expect(well.getByTestId("stainless-compositor-lead")).toHaveCount(0);
    await expect(well.getByTestId("finish-conditions-lead")).toHaveCount(0);
    await expect(well.getByTestId("dirty-clean-pair-lead")).toHaveCount(0);
    await expect(well.getByTestId("truck-view-lead")).toHaveCount(0);

    const hoodPoly = page.getByTestId("truck-seat-hood").locator("polygon");
    const activeFill = await hoodPoly.evaluate((el) => getComputedStyle(el).fill);
    expect(fillAlpha(activeFill), activeFill).toBe(0);

    await expect(page.getByTestId("seat-lead")).toContainText(
      "Vinyl Wrap for 12 Months after Installation.",
    );
    await expect(page.getByTestId("etch-lock-copy")).toHaveCount(0);
    await expect(page.getByTestId("panel-mockup")).toHaveCount(0);
    await expect(page.getByTestId("intent-only-banner")).toHaveCount(0);
    await expect(page.getByTestId("adjacent-neighbors")).toHaveCount(0);
    await expect(page.getByTestId("seat-primary-cta")).toBeVisible();
    await expect(page.getByTestId("panel-stats")).toBeVisible();

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
  });

  test("name chip highlight stays on the pill and clears after a seat visit", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const fasciaSeat = page.getByTestId("truck-seat-front-fascia");
    const fasciaPoly = fasciaSeat.locator("polygon");
    const fasciaChip = page.getByTestId("truck-name-chip-front-fascia");
    const chipLink = page.locator(
      "a.truck-name-chip-link[data-seat-id='front-fascia']",
    );

    await fasciaChip.hover();
    await expect
      .poll(async () =>
        fillAlpha(
          await fasciaPoly.evaluate((el) => getComputedStyle(el).fill),
        ),
      )
      .toBe(0);
    await expect
      .poll(async () =>
        fasciaPoly.evaluate((el) => getComputedStyle(el).strokeWidth),
      )
      .toBe("0px");
    const hoverChip = await fasciaChip.evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        stroke: style.stroke,
        fill: style.fill,
        strokeWidth: style.strokeWidth,
      };
    });
    expect(hoverChip.stroke).toMatch(/214,\s*255,\s*63|rgb\(214 255 63/);
    expect(fillAlpha(hoverChip.fill)).toBeGreaterThan(0);
    expect(Number.parseFloat(hoverChip.strokeWidth)).toBeGreaterThan(1.5);
    await expect
      .poll(async () => chipLink.evaluate((el) => getComputedStyle(el).outlineStyle))
      .toBe("none");

    await parkPointer(page);
    await fasciaSeat.focus();
    await expect(fasciaSeat).toBeFocused();
    await expect(fasciaChip).toHaveClass(/is-lit/);
    const focusPaint = await fasciaPoly.evaluate((el) => {
      const style = getComputedStyle(el);
      return { fill: style.fill, strokeWidth: style.strokeWidth };
    });
    expect(fillAlpha(focusPaint.fill)).toBe(0);
    expect(focusPaint.strokeWidth).toBe("0px");
    expect(
      await fasciaSeat.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe("none");

    await page.evaluate(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    await expect(fasciaChip).not.toHaveClass(/is-lit/);
    await expect(fasciaSeat).not.toBeFocused();

    await page.evaluate(() => {
      const stop = (event: Event) => {
        event.preventDefault();
      };
      (window as unknown as { __stopChipClick?: (event: Event) => void }).__stopChipClick =
        stop;
      document.querySelectorAll(".truck-view-svg a").forEach((anchor) => {
        anchor.addEventListener("click", stop, { capture: true });
      });
    });
    const box = await fasciaChip.boundingBox();
    if (!box) throw new Error("fascia chip box missing");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    expect(
      await page.evaluate(() => {
        const active = document.activeElement;
        return Boolean(
          active instanceof Element &&
            active.closest("[data-testid='truck-view-seats']"),
        );
      }),
    ).toBe(false);
    expect(
      fillAlpha(await fasciaPoly.evaluate((el) => getComputedStyle(el).fill)),
    ).toBe(0);
    await page.mouse.up();
    await page.evaluate(() => {
      const stop = (window as unknown as { __stopChipClick?: (event: Event) => void })
        .__stopChipClick;
      if (!stop) return;
      document.querySelectorAll(".truck-view-svg a").forEach((anchor) => {
        anchor.removeEventListener("click", stop, { capture: true });
      });
    });
    await parkPointer(page);
    await assertRestHitOnly(page, "truck-seat-front-fascia");

    await fasciaChip.click();
    await page.waitForURL("**/panels/front-fascia");
    await page.goBack();
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-name-chips",
      "true",
    );
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const active = document.activeElement;
          return {
            inBoard: Boolean(
              active instanceof Element &&
                active.closest("[data-testid='truck-view-seats']"),
            ),
            lit: Boolean(document.querySelector(".truck-name-chip.is-lit")),
          };
        }),
      )
      .toEqual({ inBoard: false, lit: false });
    await parkPointer(page);
    await assertRestHitOnly(page, "truck-seat-front-fascia");
  });
});
