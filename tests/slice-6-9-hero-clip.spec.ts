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
import { PUBLIC_COPY } from "../src/lib/public-copy";

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

function fullyInside(inner: Box, outer: Box, pad = 2) {
  expect(inner.left).toBeGreaterThanOrEqual(outer.left - pad);
  expect(inner.top).toBeGreaterThanOrEqual(outer.top - pad);
  expect(inner.right).toBeLessThanOrEqual(outer.right + pad);
  expect(inner.bottom).toBeLessThanOrEqual(outer.bottom + pad);
}

async function expectUnclippedInViewport(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("viewport missing");
  const box = await boxOf(locator);
  expect(box.right - box.left).toBeGreaterThan(8);
  expect(box.bottom - box.top).toBeGreaterThan(8);
  fullyInside(box, {
    top: 0,
    left: 0,
    right: viewport.width,
    bottom: viewport.height,
  });
}

/**
 * Slice 6.9 — residual mobile clip check after 0.7 hero preview.
 * Wordmark + truck still + H1 must stay fully on-screen at phone width.
 * Does not rewrite PUBLIC_COPY. Does not claim 6.10 OG/favicon work.
 */
test.describe("slice 6.9: hero wordmark and truck not clipped on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
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

  test("mobile first viewport keeps wordmark, truck, and H1 unclipped", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const wordmark = page.getByTestId("brand-wordmark");
    const truck = page.getByTestId("hero-truck-preview");
    const title = page.locator("#hero-title");
    const hero = page.locator("section.hero");

    await expect(wordmark).toHaveText(BRAND.name);
    await expect(title).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(truck).toBeVisible();
    await expect(truck.locator("img")).toHaveAttribute(
      "src",
      "/hero-truck-preview.jpg",
    );

    await expectUnclippedInViewport(page, wordmark);
    await expectUnclippedInViewport(page, title);
    await expectUnclippedInViewport(page, truck);

    const heroBox = await boxOf(hero);
    const titleBox = await boxOf(title);
    const truckBox = await boxOf(truck);
    fullyInside(titleBox, heroBox);
    fullyInside(truckBox, heroBox);

    // H1 glyphs must not overflow the hero horizontally (extends campaign gate).
    const glyph = await title.evaluate((el) => {
      const host = el.closest(".hero");
      if (!(host instanceof HTMLElement)) throw new Error("hero missing");
      const range = document.createRange();
      range.selectNodeContents(el);
      const last = [...range.getClientRects()].at(-1);
      return {
        overflowX: el.scrollWidth - el.clientWidth,
        lastRight: last?.right ?? 0,
        heroRight: host.getBoundingClientRect().right,
        titleBottom: el.getBoundingClientRect().bottom,
        heroBottom: host.getBoundingClientRect().bottom,
      };
    });
    expect(glyph.overflowX).toBeLessThanOrEqual(1);
    expect(glyph.lastRight).toBeLessThanOrEqual(glyph.heroRight + 1);
    expect(glyph.titleBottom).toBeLessThanOrEqual(glyph.heroBottom + 1);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("narrower 360px phone still keeps hero signals in frame", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    await expectUnclippedInViewport(page, page.getByTestId("brand-wordmark"));
    await expectUnclippedInViewport(page, page.locator("#hero-title"));
    await expectUnclippedInViewport(
      page,
      page.getByTestId("hero-truck-preview"),
    );
  });
});
