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
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  SITE_CHROME_FOOTER_INDEPENDENT,
  SITE_CHROME_FOOTER_LINE,
} from "../src/components/SiteChromeFooter";

/**
 * Slice 14.24 — 404 and 500 share footer strings via SiteChromeFooter.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();

test.describe("slice 14.24: 404 and 500 share footer strings", () => {
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

  test("SiteChromeFooter is the single PUBLIC_COPY footer source", () => {
    expect(SITE_CHROME_FOOTER_LINE).toBe(PUBLIC_COPY.footer.line);
    expect(SITE_CHROME_FOOTER_INDEPENDENT).toBe(
      PUBLIC_COPY.footer.independent,
    );
    expect(SITE_CHROME_FOOTER_LINE).toContain("BrandMyBeast");
    expect(SITE_CHROME_FOOTER_LINE).toContain("@BrandMyBeast");
    expect(SITE_CHROME_FOOTER_LINE).toContain("hello@brandmybeast.com");
    expect(SITE_CHROME_FOOTER_LINE.toLowerCase()).not.toMatch(/\blease\b/);

    const shared = readFileSync(
      join(ROOT, "src/components/SiteChromeFooter.tsx"),
      "utf8",
    );
    expect(shared).toContain("PUBLIC_COPY.footer.line");
    expect(shared).toContain("PUBLIC_COPY.footer.independent");
    expect(shared).toContain("Slice 14.24");

    const notFound = readFileSync(join(ROOT, "src/app/not-found.tsx"), "utf8");
    const error = readFileSync(join(ROOT, "src/app/error.tsx"), "utf8");
    expect(notFound).toContain("SiteChromeFooter");
    expect(error).toContain("SiteChromeFooter");
    // No duplicated inline footer copy in either page.
    expect(notFound).not.toMatch(/PUBLIC_COPY\.footer\.line/);
    expect(error).not.toMatch(/PUBLIC_COPY\.footer\.line/);
  });

  test("404 renders the shared footer strings", async ({ page }) => {
    const response = await page.goto("/this-is-not-a-panel-route-1424");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("not-found-footer-line")).toHaveText(
      PUBLIC_COPY.footer.line,
    );
    await expect(page.getByTestId("not-found-footer-independent")).toHaveCount(
      0,
    );
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("site-footer-line")).toHaveText(
      PUBLIC_COPY.footer.line,
    );
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
