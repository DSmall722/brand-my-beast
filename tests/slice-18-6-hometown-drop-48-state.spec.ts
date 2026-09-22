import { expect, test } from "@playwright/test";
import { BRAND, CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 18.6 — hometown lead drops 48-state. Etch stays locked under buyout.
 * Slice 19.2 takes the lane off public seats. CLOSE_AT null. No Stripe.
 */

test.describe("slice 18.6: hometown lead drops 48-state", () => {
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

  test("hood and driver door drop 48-state", async ({
    page,
  }) => {
    for (const id of ["hood", "driver-door"] as const) {
      await page.goto(`/panels/${id}`);
      await expect(page.getByTestId("hometown-lane")).toHaveCount(0);
      const html = await page.content();
      expect(html).not.toContain("48-state");
      expect(html).toContain("$58,000");
      expect(html).toContain("Etch");
      expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    }
  });
});
