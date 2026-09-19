import { expect, test } from "@playwright/test";
import { BRAND, CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 18.3 — /unsubscribe drops Stub and LLC.
 * Buyer unsubscribe plus hello@. CLOSE_AT null. No Stripe.
 */

test.describe("slice 18.3: unsubscribe drops stub copy", () => {
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

  test("unsubscribe page is buyer copy without Stub or LLC", async ({
    page,
  }) => {
    await page.goto("/unsubscribe");
    await expect(page.getByTestId("unsubscribe-page")).toBeVisible();
    await expect(page.getByRole("link", { name: BRAND.email })).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("Stub");
    expect(html).not.toContain("LLC");
    expect(html).toContain("hello@brandmybeast.com");
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("the operator");
    expect(html).toContain("brandmybeast.com");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
