import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { isPublicSignInClosed } from "../src/lib/auth/mode";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  SEATS_OPEN,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 20.1 — homepage header hides Sign in while public sign-in is closed.
 * Join the list stays. CI test login stays available. CLOSE_AT null.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";

test.describe("slice 20.1: hide homepage Sign in while closed", () => {
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

  test("SEATS_OPEN is not flipped in campaign.ts", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(SEATS_OPEN).toBe(true);
  });

  test("live without a buyer provider is closed; test login is not", () => {
    expect(
      isPublicSignInClosed({
        AUTH_MODE: "live",
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      }),
    ).toBe(true);
    expect(isPublicSignInClosed({ AUTH_MODE: "test" })).toBe(false);
  });

  test("homepage keeps Join the list; H1 unchanged", async ({ page }) => {
    await page.goto("/");
    const header = page.locator(".site-header");
    await expect(header).toHaveAttribute("data-signin-closed", "false");
    await expect(
      header.getByRole("link", { name: PUBLIC_COPY.header.nav }),
    ).toHaveText("Contact BMB");
    await expect(page.getByTestId("signin-link")).toBeVisible();
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
