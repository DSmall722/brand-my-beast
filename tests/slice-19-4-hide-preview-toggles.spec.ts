import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  SEATS_OPEN,
  TRUCK_EXISTS,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 19.4 — hide Day/Night/Wet/Dirty and etch preview toggles on
 * public seats while TRUCK_EXISTS is false. Stainless still + numbers only.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";

test.describe("slice 19.4: hide preview toggles while truck does not exist", () => {
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

  test("SEATS_OPEN and TRUCK_EXISTS are not flipped", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
    expect(src).toMatch(/process\.env\.TRUCK_EXISTS === "true"/);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(process.env.TRUCK_EXISTS ?? "").not.toMatch(/^(true|1)$/i);
    expect(SEATS_OPEN).toBe(true);
    expect(TRUCK_EXISTS).toBe(false);
  });

  test("hood still + numbers stay; Day/Night/Wet/Dirty and etch tabs gone", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    const mockup = page.getByTestId("panel-mockup");
    await expect(mockup).toBeVisible();
    await expect(mockup).toHaveAttribute("data-truck-exists", "false");
    await expect(mockup).toHaveAttribute("data-preview-toggles", "false");
    await expect(page.getByTestId("panel-seat-h1")).toHaveAttribute(
      "data-panel-n",
      "1",
    );
    await expect(page.locator(".panel-mockup-face")).toBeVisible();
    await expect(page.locator(".panel-mockup-label")).toHaveCount(0);
    await expect(page.getByTestId("panel-seat-h1")).toHaveText("1 · Hood");

    await expect(page.getByTestId("compositor-mode-wrap")).toHaveCount(0);
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("finish-conditions")).toHaveCount(0);
    await expect(page.getByTestId("finish-condition-day")).toHaveCount(0);
    await expect(page.getByTestId("finish-condition-night")).toHaveCount(0);
    await expect(page.getByTestId("finish-condition-wet")).toHaveCount(0);
    await expect(page.getByTestId("finish-condition-dirty")).toHaveCount(0);
    await expect(page.getByTestId("dirty-clean-pair-toggle")).toHaveCount(0);

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("homepage H1 is unchanged and Notify me stays", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("features.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
