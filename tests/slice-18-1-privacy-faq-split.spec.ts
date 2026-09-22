import { expect, test } from "@playwright/test";
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
 * QA 1047PM — privacy is a short real policy (no FAQ concatenation stub).
 */
test.describe("slice 18.1: privacy FAQ lines stay one sentence", () => {
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

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("privacy HTML is a short useful policy", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-collect")).toBeVisible();
    await expect(page.getByTestId("privacy-why")).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toContainText(BRAND.email);
    await expect(page.getByTestId("privacy-waitlist")).toHaveCount(0);
    await expect(page.getByTestId("privacy-independent")).toHaveCount(0);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("independent. not tesla");
  });
});
