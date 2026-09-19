import { expect, test } from "@playwright/test";
import { BRAND, CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 18.1 — /privacy stops concatenating FAQ answers.
 * One waitlist sentence, one Tesla sentence, no leading No.
 * CLOSE_AT null. No Stripe. FEATURES.md stays off /.
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("privacy HTML drops concatenated FAQ nos", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-waitlist")).toHaveText(
      PUBLIC_COPY.waitlist.idleNote,
    );
    await expect(page.getByTestId("privacy-independent")).toHaveText(
      PUBLIC_COPY.footer.independent,
    );
    const html = await page.content();
    expect(html).not.toContain("No. The waitlist");
    expect(html).not.toContain("No. Independent");
    expect(html).toContain("hello@brandmybeast.com");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
