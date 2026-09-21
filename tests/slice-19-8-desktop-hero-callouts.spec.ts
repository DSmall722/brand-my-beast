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
 * Slice 19.8 — desktop hero: callouts 2 / 3 / 5 must not sit on the H1 glyphs.
 * H1 text stays locked. CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Put your brand on the truck people already photograph.";
const CALLOUTS = [2, 3, 5] as const;

test.describe("slice 19.8: desktop H1 clears callouts 2 3 5", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

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

  test("H1 text is unchanged and sits under the photo, clear of 2/3/5", async ({
    page,
  }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);

    const hero = page.locator(".hero");
    await expect(hero).toHaveAttribute("data-hero-stack", "under-photo");

    const title = page.locator("#hero-title");
    await expect(title).toHaveText(LOCKED_H1);
    await expect(title).toHaveText(PUBLIC_COPY.hero.h1);

    const photo = page.getByTestId("hero-truck-preview");
    const photoBox = await photo.boundingBox();
    const titleBox = await title.boundingBox();
    if (!photoBox) throw new Error("photo missing");
    if (!titleBox) throw new Error("H1 missing");
    expect(titleBox.y).toBeGreaterThanOrEqual(photoBox.y + photoBox.height - 1);

    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);
    for (const n of CALLOUTS) {
      await expect(page.getByTestId(`hero-panel-board-${n}`)).toHaveCount(0);
    }

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("Notify me stays on the homepage", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
  });
});
