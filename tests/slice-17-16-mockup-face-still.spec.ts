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
 * Slice 17.16 — compositor .panel-mockup-face uses the hero still.
 * Not a striped empty well. No invented wrap or etch photo.
 */

test.describe("slice 17.16: mockup face uses the stainless still", () => {
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

  test("panel-mockup-face rule is the shared still, not stripes", () => {
    const css = readFileSync(
      join(process.cwd(), "src/app/styles/board.css"),
      "utf8",
    );
    const block = css.split(".panel-mockup-face {")[1]?.split("}")[0] ?? "";
    expect(block).toContain('url("/hero-truck-preview.jpg")');
    expect(block).not.toContain("repeating-linear-gradient");
  });

  test("seat mockup face renders the still", async ({ page }) => {
    await page.goto("/panels/hood");
    const photo = page.locator(".truck-view-photo");
    await expect(photo).toHaveAttribute("src", "/truck-view-front.jpg");
    await expect(page.getByTestId("seat-stage")).toBeVisible();
    await expect(
      page.getByTestId("seat-stage").getByTestId("stainless-compositor-lead"),
    ).toHaveCount(0);
  });
});
