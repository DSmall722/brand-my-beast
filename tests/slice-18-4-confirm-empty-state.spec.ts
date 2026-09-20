import { expect, test } from "@playwright/test";
import { BRAND, CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 18.4 — /waitlist/confirm with no token is a buyer empty state.
 * Not “Missing confirm token.” Back to the board. No env keys. No lease.
 */

const ENV_KEYS = [
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "DATABASE_URL",
  "GITHUB_ID",
] as const;

test.describe("slice 18.4: confirm page empty state", () => {
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

  test("missing token is a buyer empty state", async ({ page }) => {
    const res = await page.goto("/waitlist/confirm");
    expect(res?.status()).toBe(200);
    await expect(page.getByTestId("waitlist-confirm-error")).toContainText(
      "missing or expired",
    );
    await expect(page.getByRole("link", { name: "Back to the board" })).toHaveAttribute(
      "href",
      "/",
    );
    const html = await page.content();
    expect(html).not.toContain("Missing confirm token.");
    for (const key of ENV_KEYS) {
      expect(html).not.toContain(key);
    }
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
