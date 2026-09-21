import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import {
  isPublicCopyTruckAlt,
  truckImgAlt,
  TRUCK_IMG_ALTS,
} from "../src/lib/truck-img-alt";

/**
 * Slice 10.8 — every truck `<img>` alt comes from PUBLIC_COPY.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.8: truck img alts from PUBLIC_COPY", () => {
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

  test("unit: truckImgAlt is PUBLIC_COPY only", () => {
    expect(truckImgAlt("hero")).toBe(PUBLIC_COPY.hero.imageAlt);
    expect(truckImgAlt("board")).toBe(PUBLIC_COPY.board.truckImageAlt);
    expect(TRUCK_IMG_ALTS).toContain(PUBLIC_COPY.hero.imageAlt);
    expect(TRUCK_IMG_ALTS).toContain(PUBLIC_COPY.board.truckImageAlt);
    expect(isPublicCopyTruckAlt(PUBLIC_COPY.hero.imageAlt)).toBe(true);
    expect(isPublicCopyTruckAlt(PUBLIC_COPY.board.truckImageAlt)).toBe(true);
    expect(isPublicCopyTruckAlt("A cool Cybertruck photo")).toBe(false);
    expect(PUBLIC_COPY.hero.imageAlt.toLowerCase()).not.toContain(
      "permanent vinyl",
    );
  });

  test("homepage: every truck img alt is from PUBLIC_COPY", async ({
    page,
  }) => {
    await page.goto("/");
    const truckImgs = page.locator(
      'img[data-truck-img], img[src*="truck"], img[src*="cyber"]',
    );
    const count = await truckImgs.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i += 1) {
      const img = truckImgs.nth(i);
      const alt = await img.getAttribute("alt");
      expect(alt, `truck img #${i} missing alt`).toBeTruthy();
      expect(
        isPublicCopyTruckAlt(alt ?? ""),
        `truck img #${i} alt not from PUBLIC_COPY: ${alt}`,
      ).toBe(true);
    }

    await expect(page.getByTestId("truck-img-hero")).toHaveAttribute(
      "alt",
      PUBLIC_COPY.hero.imageAlt,
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
