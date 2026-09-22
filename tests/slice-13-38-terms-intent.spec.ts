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
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * QA 1047PM — /terms deleted. Intent-is-not-a-charge stays in PUBLIC_COPY.footer.
 */
test.describe("slice 13.38: terms removed; intent phrase kept in copy", () => {
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

  test("intent phrase stays in PUBLIC_COPY; /terms redirects to privacy", async ({
    page,
  }) => {
    expect(PUBLIC_COPY.footer.intentNotACharge).toBe("Intent is not a charge.");
    await page.goto("/terms");
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByTestId("privacy-page")).toBeVisible();
    await expect(page.getByTestId("terms-page")).toHaveCount(0);
  });
});
