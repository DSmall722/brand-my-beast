import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  SEATS_OPEN,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 19.7 — lime outlines stay; fill is off at rest.
 * Homepage stills keep baked numbers. Numbered CSS discs stay off.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Put your brand on the truck people already photograph.";

test.describe("slice 19.7: hide board-truck seat polygons", () => {
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

  test("SEATS_OPEN is not flipped in campaign.ts", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(SEATS_OPEN).toBe(true);
  });

  test("seat overlay outlines only at rest; homepage keeps legend 1–11", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    const seats = page.getByTestId("truck-view-seats");
    await expect(seats).toHaveAttribute("data-polygons", "outline");
    const polygon = page.locator('[data-testid="truck-seat-hood"] polygon');
    const fill = await polygon.evaluate((el) => getComputedStyle(el).fill);
    expect(
      fill === "transparent" ||
        fill === "none" ||
        fill.endsWith(", 0)") ||
        /\/\s*0\)/.test(fill),
    ).toBe(true);
    const stroke = await polygon.evaluate((el) => getComputedStyle(el).stroke);
    expect(stroke).not.toBe("none");
    expect(stroke).not.toBe("transparent");

    await page.goto("/");
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);
    for (let n = 1; n <= 11; n += 1) {
      await expect(page.getByTestId(`panel-legend-${n}`)).toBeVisible();
      await expect(page.getByTestId(`panel-legend-${n}`)).toHaveText(
        new RegExp(`^${n}\\b`),
      );
    }
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("homepage H1 is unchanged and Notify me stays", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Notify me");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("features.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
