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
 * Slice 20.10 — 404 / partner use branded Back to the board.
 * Not a shop tease. CLOSE_AT null. No Stripe. H1 unchanged.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Put your brand on the truck people already photograph.";

test.describe("slice 20.10: branded back-to-board", () => {
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

  test("PUBLIC_COPY chrome back-to-board is branded", () => {
    expect(PUBLIC_COPY.chrome.backToBoard).toBe("Back to the board");
    const md = readFileSync(join(ROOT, "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain("Back to the board");
    const notFound = readFileSync(join(ROOT, "src/app/not-found.tsx"), "utf8");
    expect(notFound).toContain("PUBLIC_COPY.chrome.backToBoard");
    expect(notFound).not.toMatch(/>\s*Home\s*</);
    const partner = readFileSync(
      join(ROOT, "src/app/partner/shop/page.tsx"),
      "utf8",
    );
    expect(partner).toContain("PUBLIC_COPY.chrome.backToBoard");
  });

  test("404 is back-to-board, not a shop tease", async ({ page }) => {
    const response = await page.goto("/this-is-not-a-panel-route");
    expect(response?.status()).toBe(404);
    const home = page.getByTestId("not-found-home");
    await expect(home).toHaveText(PUBLIC_COPY.chrome.backToBoard);
    await expect(home).toHaveAttribute("href", "/");
    const html = await page.content();
    expect(html).not.toContain("/partner/shop");
    expect(html).not.toMatch(/See the wrap shop/i);
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage H1 stays locked", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
