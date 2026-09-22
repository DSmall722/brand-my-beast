import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 17.6 — hero.css ≤720px stacks caption / H1 / lead / CTAs under the photo.
 * Drops the phone max-height lock. CLOSE_AT null. No Stripe.
 */

const HERO_CSS = join(process.cwd(), "src/app/styles/hero.css");

async function topOf(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing box");
  return box.y;
}

test.describe("slice 17.6: phone hero copy stacks under the photo", () => {
  test.use({ viewport: { width: 390, height: 844 } });

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

  test("720px hero rule drops the phone max-height lock", () => {
    const css = readFileSync(HERO_CSS, "utf8");
    const block = css.split("@media (max-width: 720px)")[1] ?? "";
    expect(block.length).toBeGreaterThan(40);
    expect(block).not.toContain("max-height: calc(100svh - 5.5rem)");
    expect(block).toContain("max-height: none");
    expect(block).toContain("grid-row: 2");
  });

  test("caption, H1, lead, and CTAs sit under the photo", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const photo = page.getByTestId("hero-truck-preview");
    const photoBox = await photo.boundingBox();
    if (!photoBox) throw new Error("photo missing");
    const floor = photoBox.y + photoBox.height - 1;
    await expect(page.getByTestId("hero-preview-label")).toHaveCount(0);
    await expect(page.locator(".hero-lead")).toHaveCount(0);
    const title = await topOf(page.locator("#hero-title"));
    const actions = await topOf(page.locator(".hero-actions"));
    expect(title).toBeGreaterThanOrEqual(floor);
    expect(actions).toBeGreaterThanOrEqual(floor);
    expect(actions).toBeGreaterThan(title);
  });
});
