import { readFileSync } from "node:fs";
import { join } from "node:path";
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
 * Slice 17.4 — /signin live empty state + waitlist link.
 * No env key names in that public block. CLOSE_AT null. No Stripe.
 */

const PAGE = join(process.cwd(), "src/app/signin/page.tsx");

test.describe("slice 17.4: sign-in live empty state", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("live empty state links the waitlist and hides env key names", () => {
    const src = readFileSync(PAGE, "utf8");
    const live = src.split('data-testid="signin-not-open"')[1]?.split("mode !== \"live\"")[0] ?? "";
    expect(src).toContain('data-testid="signin-not-open"');
    expect(src).toContain('href="/#contactus"');
    expect(live).not.toMatch(/AUTH_|RESEND_|DATABASE_URL/);
    expect(src).toContain('mode !== "live"');
  });

  test("test-mode sign-in HTML has no env key names", async ({ page }) => {
    await page.goto("/signin");
    await expect(page.getByTestId("signin-page")).toBeVisible();
    await expect(page.getByTestId("signin-not-open")).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain("AUTH_SECRET");
    expect(html).not.toContain("RESEND_API_KEY");
    expect(html).not.toContain("DATABASE_URL");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
