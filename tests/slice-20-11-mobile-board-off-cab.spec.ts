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
import {
  HERO_MOBILE_CAB_GLASS_MAX_Y,
  PANEL_BOARD_MARKS,
  panelBoardIsComplete,
} from "../src/lib/panel-board";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 20.11 — mobile board numbers 1–12 sit off the cab glass.
 * 19.8 is desktop H1 only. CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Put your brand on the truck people already photograph.";

test.describe("slice 20.11: mobile board off cab glass", () => {
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

  test("mobile hero marks sit below the cab glass line", () => {
    expect(panelBoardIsComplete()).toBe(true);
    expect(PANEL_BOARD_MARKS).toHaveLength(12);
    for (const mark of PANEL_BOARD_MARKS) {
      expect(mark.heroMobile.y).toBeGreaterThan(HERO_MOBILE_CAB_GLASS_MAX_Y);
      expect(mark.heroMobile.y).toBeLessThanOrEqual(100);
    }
  });

  test("390px homepage keeps 1–12 off the cab glass", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    const board = page.getByTestId("hero-panel-board");
    await expect(board).toHaveAttribute("data-mobile-board", "off-cab");
    for (let n = 1; n <= 12; n += 1) {
      const callout = page.getByTestId(`hero-panel-board-${n}`);
      await expect(callout).toBeVisible();
      const mobileY = Number(await callout.getAttribute("data-hero-mobile-y"));
      expect(mobileY).toBeGreaterThan(HERO_MOBILE_CAB_GLASS_MAX_Y);
      const topPct = await callout.evaluate((el) => {
        const parent = el.closest(".panel-board");
        if (!parent) return Number.NaN;
        const topPx = Number.parseFloat(getComputedStyle(el).top);
        return (topPx / parent.getBoundingClientRect().height) * 100;
      });
      expect(topPct).toBeCloseTo(mobileY, 0);
    }
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
