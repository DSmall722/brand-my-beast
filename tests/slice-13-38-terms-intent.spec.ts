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
 * Slice 13.38 — approved Terms page. Intent-is-not-a-charge stays in PUBLIC_COPY.
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */
test.describe("slice 13.38: terms bids and payment", () => {
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

  test("unit: PUBLIC_COPY locks intent-is-not-a-charge line", () => {
    expect(PUBLIC_COPY.footer.intentNotACharge).toBe(
      "Intent is not a charge.",
    );
  });

  test("terms page shows bids and payment without a close clock", async ({
    page,
  }) => {
    await page.goto("/terms");
    await expect(page.getByTestId("terms-page")).toBeVisible();
    await expect(page.getByTestId("terms-bids")).toContainText(
      'Displayed "Current Bid" amounts are opening prices until a live bid is placed on that seat.',
    );
    await expect(page.getByTestId("terms-contact")).toContainText(BRAND.email);

    const html = await page.content();
    expect(html).toContain("BrandMyBeast");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("Close date is unset");
    expect(html.toLowerCase()).not.toMatch(/stripe/);
  });
});
