import { expect, test } from "@playwright/test";
import { BRAND, CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 18.2 — /terms drops Close date is unset and (null).
 * When-seats-open line only. Do not print CLOSE_AT.
 */

const WHEN = PUBLIC_COPY.questions.items.find(
  (item) => item.q === "When does bidding start?",
)?.a;

test.describe("slice 18.2: terms clock drops null", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
    expect(WHEN).toContain("When seats open");
    expect(WHEN).toContain("no date");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("terms HTML drops null clock", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByTestId("terms-page")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Governing law" })).toBeVisible();
    const html = await page.content();
    const body = await page.locator("main").innerHTML();
    expect(body).not.toContain("null");
    expect(html).not.toContain("(null)");
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("Close date is unset");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
