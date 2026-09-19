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
 * Slice 17.7 — viewport-fit=cover + safe-area insets on header,
 * hero actions, and page bottom. CLOSE_AT null. No Stripe.
 */

test.describe("slice 17.7: safe-area insets", () => {
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

  test("viewport-fit cover and safe-area insets are in source", () => {
    const layout = readFileSync(
      join(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );
    expect(layout).toContain('viewportFit: "cover"');
    const tokens = readFileSync(
      join(process.cwd(), "src/app/styles/tokens.css"),
      "utf8",
    );
    expect(tokens).toMatch(/\.site-header[\s\S]*safe-area-inset-top/);
    expect(tokens).toMatch(/body[\s\S]*safe-area-inset-bottom/);
    const hero = readFileSync(
      join(process.cwd(), "src/app/styles/hero.css"),
      "utf8",
    );
    const actions = hero.split(".hero-actions {")[1]?.split("}")[0] ?? "";
    expect(actions).toContain("safe-area-inset-bottom");
    expect(actions).toContain("safe-area-inset-left");
    expect(actions).toContain("safe-area-inset-right");
  });

  test("homepage viewport meta includes viewport-fit=cover", async ({
    page,
  }) => {
    await page.goto("/");
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(content ?? "").toContain("viewport-fit=cover");
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("FEATURES.md");
  });
});
