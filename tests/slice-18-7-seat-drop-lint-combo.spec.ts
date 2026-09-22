import { expect, test } from "@playwright/test";
import { BRAND, CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 18.7 — public seat HTML drops optional lint, linter, Neighbor combo later.
 * Neighbor opening list stays. CLOSE_AT null. No Stripe. FEATURES.md stays off /.
 */

test.describe("slice 18.7: hood HTML drops lint and combo-later", () => {
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

  test("hood HTML keeps openings and drops the three phrases", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("neighbor-combo-list")).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain("optional lint");
    expect(html).not.toContain("linter");
    expect(html).not.toContain("Neighbor combo later");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);

    await page.goto("/");
    const home = await page.content();
    expect(home).toContain("$58,000");
    expect(home).toContain("$120,000");
  });
});
