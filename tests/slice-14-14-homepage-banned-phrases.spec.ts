import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  TRUCK_EXISTS,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.14 — homepage HTML has no “Season 2”, “Clemson Saturday”, or
 * “48-state.” Vapor boards stay behind TRUCK_EXISTS. CLOSE_AT null. No Stripe.
 * No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();

const BANNED_HOMEPAGE_PHRASES = [
  "Season 2",
  "Clemson Saturday",
  "48-state",
] as const;

test.describe("slice 14.14: homepage HTML bans Season 2 / Clemson / 48-state", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("TRUCK_EXISTS stays false so vapor boards stay out of home HTML", () => {
    expect(TRUCK_EXISTS).toBe(false);
  });

  test("homepage HTML has no Season 2, Clemson Saturday, or 48-state", async ({
    page,
  }) => {
    expect(TRUCK_EXISTS).toBe(false);
    await page.goto("/");
    await expect(page.getByTestId("home-main")).toHaveAttribute(
      "data-truck-exists",
      "false",
    );

    const html = await page.content();
    for (const phrase of BANNED_HOMEPAGE_PHRASES) {
      expect(html, `homepage must not contain “${phrase}”`).not.toContain(
        phrase,
      );
    }

    await expect(page.getByTestId("season-two")).toHaveCount(0);
    await expect(page.getByTestId("clemson-saturday-lock")).toHaveCount(0);

    const lower = html.toLowerCase();
    expect(lower).not.toMatch(/\blease\b/);
    expect(lower).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
