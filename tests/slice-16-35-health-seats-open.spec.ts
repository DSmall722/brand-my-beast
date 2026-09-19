import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { formatHealthSeatsOpen } from "../src/lib/operator-health";
import { resolveSeatsOpen } from "../src/lib/seats-open";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.35 — health panel shows SEATS_OPEN because 14.17 exists.
 * Does not flip the flag. CLOSE_AT null. No Stripe.
 */

async function signIn(page: Page) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill("operator@example.com");
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 16.35: health shows SEATS_OPEN", () => {
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

  test("label is the live flag when 14.17 exists, else unset", () => {
    expect(formatHealthSeatsOpen(false, true)).toBe("unset");
    expect(formatHealthSeatsOpen(false, false)).toBe("unset");
    expect(formatHealthSeatsOpen(true, true)).toBe("true");
    expect(formatHealthSeatsOpen(true, false)).toBe("false");
    expect(existsSync(join(process.cwd(), "src/lib/seats-open.ts"))).toBe(true);
  });

  test("operator health shows SEATS_OPEN and does not flip it", async ({
    page,
  }) => {
    const before = resolveSeatsOpen();
    await signIn(page);
    await page.goto("/operator/health");
    await expect(page.getByTestId("operator-health-seats-open")).toHaveText(
      formatHealthSeatsOpen(true, before),
    );
    expect(resolveSeatsOpen()).toBe(before);
    expect(before === true || before === false).toBe(true);
  });
});
