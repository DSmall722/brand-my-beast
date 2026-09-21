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
 * Slice 17.13 — wrap-only seats do not render the Etch tab.
 * Etchable seats keep the locked tab under $120,000.
 * CLOSE_AT null. No Stripe.
 */

const WRAP_ONLY = ["front-bumper", "rear-bumper"] as const;

test.describe("slice 17.13: wrap-only seats hide the etch tab", () => {
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

  test("etchable hood keeps a locked etch tab; wrap-only seats do not", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("etch-lock-copy")).toContainText(
      "Etch stays locked until buyout",
    );

    for (const id of WRAP_ONLY) {
      await page.goto(`/panels/${id}`);
      await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
        "data-etchable",
        "false",
      );
      await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
      await expect(page.getByTestId("compositor-finish-label")).toHaveText(
        "Wrap only",
      );
    }
  });
});
