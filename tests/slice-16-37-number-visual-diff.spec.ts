import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { missingBoardNumbers } from "../src/lib/board-visual-diff";
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
 * Slice 16.37 — CI fails when a board number is gone, not on font kerning.
 * Does not pixel-compare the 16.36 fixtures.
 */

test.describe("slice 16.37: numbers, not kerning", () => {
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

  test("this spec does not pixel-diff fixtures", () => {
    expect(missingBoardNumbers([1, 2, 3])).toEqual([
      4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(
      missingBoardNumbers([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    ).toEqual([]);
    const helper = readFileSync(
      join(process.cwd(), "src/lib/board-visual-diff.ts"),
      "utf8",
    );
    expect(helper).not.toMatch(/screenshot|pixelmatch/i);
  });

  test("hero callouts 1 through 12 are present", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const present: number[] = [];
    for (let n = 1; n <= 12; n += 1) {
      const callout = page.getByTestId(`hero-panel-board-${n}`);
      await expect(callout).toBeVisible();
      present.push(n);
    }
    expect(missingBoardNumbers(present)).toEqual([]);
  });
});
