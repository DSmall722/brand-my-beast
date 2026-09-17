import { existsSync, readFileSync } from "node:fs";
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
import { OPENING_BID_RATIONALE } from "../src/lib/opening-bid-rationale";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.7 — PUBLIC_COPY seat rationale only. No H1 rewrite.
 * CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const LOCKED_H1 =
  "Put your brand on the truck people already photograph.";

test.describe("slice 14.7: PUBLIC_COPY seat rationale; no H1 rewrite", () => {
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

  test("seat rationale lives in PUBLIC_COPY; homepage H1 unchanged", () => {
    expect(PUBLIC_COPY.hero.h1).toBe(LOCKED_H1);
    expect(PUBLIC_COPY.seat.openingRationale).toBe(OPENING_BID_RATIONALE);
    expect(PUBLIC_COPY.seat.openingRationale).toContain(
      "The floor is not the sum of openings",
    );
    expect(PUBLIC_COPY.seat.openingRationale).toContain("$58,000");
    expect(PUBLIC_COPY.seat.openingRationale.toLowerCase()).not.toMatch(
      /\blease\b/,
    );

    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain("14.7");
    expect(md).toMatch(/Seat rationale only/i);
    expect(md).toContain(LOCKED_H1);
    expect(md).toContain(PUBLIC_COPY.seat.openingRationale);
    expect(md).toMatch(/Do \*\*not\*\* rewrite the homepage H1/i);
  });

  test("seat page shows rationale; home H1 unchanged", async ({ page }) => {
    await page.goto("/panels/hood");
    const line = page.getByTestId("opening-bid-rationale");
    await expect(line).toBeVisible();
    await expect(line).toContainText("The floor is not the sum of openings");
    await expect(line).toContainText("$58,000");

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(LOCKED_H1);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$120,000");
    expect(existsSync(join(process.cwd(), "vercel.json"))).toBe(true);
  });
});
