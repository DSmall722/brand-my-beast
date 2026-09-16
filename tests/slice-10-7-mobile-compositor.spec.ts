import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { TRUCK_VIEWS } from "../src/lib/truck-views";

type Box = { top: number; right: number; bottom: number; left: number };

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing bounding box");
  return {
    top: box.y,
    left: box.x,
    right: box.x + box.width,
    bottom: box.y + box.height,
  };
}

async function expectUnclippedInViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport missing");
  const box = await boxOf(locator);
  expect(box.right - box.left).toBeGreaterThan(8);
  expect(box.bottom - box.top).toBeGreaterThan(8);
  expect(box.left).toBeGreaterThanOrEqual(-2);
  expect(box.top).toBeGreaterThanOrEqual(-2);
  expect(box.right).toBeLessThanOrEqual(viewport.width + 2);
  expect(box.bottom).toBeLessThanOrEqual(viewport.height + 2);
}

/**
 * Slice 10.7 — mobile compositor: one view at a time.
 * Playwright 390px; wordmark not clipped. CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.7: mobile compositor one view", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("unit: truck views are three discrete toggles", () => {
    expect(TRUCK_VIEWS.map((row) => row.id)).toEqual([
      "side",
      "front",
      "rear",
    ]);
  });

  test("390px seat: one truck view at a time; wordmark not clipped", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await page.evaluate(() => document.fonts.ready);

    const wordmark = page.getByTestId("brand-wordmark");
    await expect(wordmark).toHaveText(BRAND.name);
    await expectUnclippedInViewport(page, wordmark);

    const hotspots = page.getByTestId("truck-view-hotspots");
    await expect(hotspots).toHaveAttribute("data-one-view", "true");
    await expect(page.getByTestId("truck-view-svg")).toHaveCount(1);
    await expect(hotspots).toHaveAttribute("data-view", "side");

    await page.getByTestId("truck-view-front").click();
    await expect(hotspots).toHaveAttribute("data-view", "front");
    await expect(page.getByTestId("truck-view-svg")).toHaveCount(1);
    await expect(page.getByTestId("truck-view-svg")).toHaveAttribute(
      "data-view",
      "front",
    );

    await page.getByTestId("truck-view-rear").click();
    await expect(hotspots).toHaveAttribute("data-view", "rear");
    await expect(page.getByTestId("truck-view-svg")).toHaveCount(1);

    const stage = page.getByTestId("truck-view-stage");
    await stage.scrollIntoViewIfNeeded();
    await expectUnclippedInViewport(page, stage);

    const mockup = page.getByTestId("panel-mockup");
    await expect(mockup).toHaveAttribute("data-finish", "wrap");
    await expect(page.getByTestId("compositor-mode-wrap")).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByTestId("dirty-clean-pair-toggle").click();
    await expect(page.getByTestId("dirty-clean-pair")).toBeVisible();
    const pair = page.getByTestId("dirty-clean-pair");
    const clean = page.getByTestId("dirty-clean-clean");
    const dirty = page.getByTestId("dirty-clean-dirty");
    const pairBox = await boxOf(pair);
    const cleanBox = await boxOf(clean);
    // One view at a time: each half is ~full pair width (scroll-snap), not 50/50.
    expect(cleanBox.right - cleanBox.left).toBeGreaterThan(
      (pairBox.right - pairBox.left) * 0.85,
    );
    const dirtyBox = await boxOf(dirty);
    expect(dirtyBox.right - dirtyBox.left).toBeGreaterThan(
      (pairBox.right - pairBox.left) * 0.85,
    );

    await page.evaluate(() => window.scrollTo(0, 0));
    await expectUnclippedInViewport(page, wordmark);

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
