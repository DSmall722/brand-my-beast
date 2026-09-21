import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { panelOpenGraphTitle } from "../src/lib/panel-open-graph";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.16 — Per-panel Open Graph title `{Panel} — BrandMyBeast`.
 * CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();
const PANEL_PAGE = join(ROOT, "src/app/panels/[panelId]/page.tsx");

test.describe("slice 14.16: per-panel Open Graph title", () => {
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

  test("panelOpenGraphTitle uses em dash and BrandMyBeast", () => {
    expect(PANELS.length).toBe(11);
    for (const panel of PANELS) {
      expect(panelOpenGraphTitle(panel)).toBe(`${panel.name} — BrandMyBeast`);
    }
    expect(panelOpenGraphTitle({ name: "Hood" })).toBe("Hood — BrandMyBeast");
  });

  test("panel page wires generateMetadata via panelOpenGraphTitle", () => {
    const src = readFileSync(PANEL_PAGE, "utf8");
    expect(src).toContain("generateMetadata");
    expect(src).toContain("panelOpenGraphTitle");
    expect(src).toContain("openGraph:");
  });

  test("hood panel document title and og:title match helper", async ({
    page,
  }) => {
    const hood = PANELS.find((row) => row.id === "hood");
    expect(hood).toBeTruthy();
    const expected = panelOpenGraphTitle(hood!);

    await page.goto("/panels/hood");
    await expect(page).toHaveTitle(expected);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      expected,
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
