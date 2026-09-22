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
import {
  COMBO_LOT_LEAD,
  comboLotCopyIsSafe,
  comboLotFor,
  comboLotInventedPrice,
} from "../src/lib/combo-lots";

/**
 * Slice 10.10 — neighbor combo is display only.
 * No invented combo price. CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.10: neighbor combo display only", () => {
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

  test("unit: combo lot has openings only — no invented combo price", () => {
    expect(comboLotCopyIsSafe()).toBe(true);
    expect(COMBO_LOT_LEAD.toLowerCase()).toContain("no combo price");
    expect(COMBO_LOT_LEAD.toLowerCase()).toContain("not a joint bid");
    expect(comboLotInventedPrice(COMBO_LOT_LEAD)).toBe(false);
    expect(comboLotInventedPrice("Combo price $40,000")).toBe(true);
    expect(comboLotInventedPrice("Bundle for $25,000")).toBe(true);
    expect(comboLotInventedPrice("$8,000 + $6,000 package")).toBe(true);

    const lot = comboLotFor("hood");
    expect(lot.neighbors.length).toBeGreaterThan(0);
    for (const neighbor of lot.neighbors) {
      expect(neighbor.openingUsd).toBeGreaterThan(0);
      expect(Number.isFinite(neighbor.openingUsd)).toBe(true);
    }
    // No derived package total lives on the lot type.
    expect(
      Object.prototype.hasOwnProperty.call(lot, "comboPriceUsd"),
    ).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(lot, "packageUsd")).toBe(
      false,
    );
  });

  test("seat: neighboring seats block is gone; no combo price", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("neighbor-combo")).toHaveCount(0);
    await expect(page.getByTestId("adjacent-neighbors")).toHaveCount(0);
    await expect(page.getByText("Neighboring seats")).toHaveCount(0);
    const text = await page.getByTestId("panel-intent-page").innerText();
    expect(comboLotInventedPrice(text)).toBe(false);
    expect(text.toLowerCase()).not.toMatch(/bundle for \$/);

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
