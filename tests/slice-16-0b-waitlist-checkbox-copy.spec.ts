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

/**
 * Slice 16.0b — PUBLIC_COPY waitlist checkbox strings.
 * Label + hint only. No H1 rewrite. No form wire (16.0e).
 * CLOSE_AT null. No Stripe. SEATS_OPEN untouched.
 */

const LOCKED_H1 =
  "Advertise your brand on the truck that people already photograph";
const LABEL = "I want the whole truck";
const HINT =
  "Check this box for information about becoming the exclusive brand advertised on the entire vehicle.";

test.describe("slice 16.0b: PUBLIC_COPY waitlist whole-truck checkbox copy", () => {
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

  test("PUBLIC_COPY waitlist carries checkbox label + hint; H1 unchanged", () => {
    expect(PUBLIC_COPY.hero.h1).toBe(LOCKED_H1);
    expect(PUBLIC_COPY.waitlist.wholeTruckCheckboxLabel).toBe(LABEL);
    expect(PUBLIC_COPY.waitlist.wholeTruckCheckboxHint).toBe(HINT);
    expect(PUBLIC_COPY.waitlist.wholeTruckCheckboxHint).not.toContain("$120,000");
    expect(
      PUBLIC_COPY.waitlist.wholeTruckCheckboxHint.toLowerCase(),
    ).not.toMatch(/\blease\b/);

    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain("16.0b");
    expect(md).toContain(LABEL);
    expect(md).toContain(HINT);
    expect(md).toContain(LOCKED_H1);
    expect(md).toMatch(/Do \*\*not\*\* rewrite the homepage H1/i);
  });

  test("homepage H1 unchanged; Notify me still present", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(LOCKED_H1);
    await expect(page.getByRole("button", { name: "Contact BMB" })).toBeVisible();
    // 16.0e wires the checkbox; 16.0b only locked the copy strings.
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
