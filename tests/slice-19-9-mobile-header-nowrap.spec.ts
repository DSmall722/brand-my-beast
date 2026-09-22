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
 * Slice 19.9 — mobile header stays one row: wordmark + Contact BMB.
 * Safe-area already 17.7. CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";

test.describe("slice 19.9: mobile header stays one row", () => {
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

  test("SEATS_OPEN is not flipped in campaign.ts", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(SEATS_OPEN).toBe(true);
  });

  test("wordmark and Contact BMB share one row", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const header = page.locator(".site-header");
    await expect(header).toHaveAttribute("data-header-row", "single");
    await expect(header).toHaveAttribute("data-signin-closed", "true");

    const wordmark = page.getByTestId("brand-wordmark");
    const join = header.getByRole("link", { name: PUBLIC_COPY.header.nav });

    await expect(wordmark).toHaveText("BrandMyBeast");
    await expect(join).toHaveText(PUBLIC_COPY.header.nav);
    await expect(page.getByTestId("signin-link")).toHaveCount(0);

    const wordBox = await wordmark.boundingBox();
    const joinBox = await join.boundingBox();
    if (!wordBox || !joinBox) {
      throw new Error("header item missing");
    }

    const tops = [wordBox.y, joinBox.y];
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(8);

    expect(wordBox.x + wordBox.width).toBeLessThanOrEqual(joinBox.x + 1);

    expect(wordBox.height).toBeLessThan(36);
    expect(joinBox.height).toBeLessThan(36);

    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
