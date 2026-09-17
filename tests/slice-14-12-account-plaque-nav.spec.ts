import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  TRUCK_EXISTS,
  formatUsd,
} from "../src/lib/campaign";
import { cabinPlaqueUiAllowed } from "../src/lib/cabin-plaque";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 14.12 — `/account` nav has no Cabin plaque while the truck does not
 * exist. Extends 13.30. CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();
const ACCOUNT_PAGE = join(ROOT, "src/app/account/page.tsx");
const SITE_CHROME = join(ROOT, "src/components/SiteChrome.tsx");
const AUTH_NAV = join(ROOT, "src/components/AuthNav.tsx");
const SLOT = join(
  ROOT,
  "src/components/account/account-truck-exists-nav.tsx",
);

const PLAQUE_NAV_NEEDLES = [
  "CabinPlaqueForm",
  "cabin-plaque-form",
  "cabin-plaque",
  "#plaque",
  "Cabin plaque",
] as const;

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 14.12: /account nav has no cabin plaque while truck missing", () => {
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
    const vercel = JSON.parse(
      readFileSync(join(ROOT, "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("TRUCK_EXISTS false; cabinPlaqueUiAllowed stays dark", () => {
    expect(TRUCK_EXISTS).toBe(false);
    expect(cabinPlaqueUiAllowed()).toBe(false);
  });

  test("account page and chrome sources omit plaque nav strings", () => {
    for (const file of [ACCOUNT_PAGE, SITE_CHROME, AUTH_NAV]) {
      const src = readFileSync(file, "utf8");
      for (const needle of PLAQUE_NAV_NEEDLES) {
        expect(src, `${file} must not contain ${needle}`).not.toContain(needle);
      }
    }
    expect(readFileSync(ACCOUNT_PAGE, "utf8")).toContain(
      "AccountTruckExistsNavSlot",
    );
    expect(readFileSync(ACCOUNT_PAGE, "utf8")).toContain('data-testid="account-nav"');
  });

  test("account truck-exists nav slot gates on TRUCK_EXISTS", () => {
    const src = readFileSync(SLOT, "utf8");
    expect(src).toContain("if (!TRUCK_EXISTS) return null");
    expect(src).toMatch(/import\("\.\/AccountCabinPlaqueNav"\)/);
  });

  test("signed-in /account nav has no cabin plaque while truck missing", async ({
    page,
  }) => {
    expect(TRUCK_EXISTS).toBe(false);
    await signIn(page, "bidder-a@example.com");

    await expect(page.getByTestId("account-page")).toHaveAttribute(
      "data-truck-exists",
      "false",
    );
    await expect(page.getByTestId("account-nav")).toBeVisible();
    await expect(page.getByTestId("account-cabin-plaque-nav")).toHaveCount(0);
    await expect(page.getByTestId("cabin-plaque-form")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /cabin plaque/i })).toHaveCount(
      0,
    );
    await expect(page.getByRole("heading", { name: /cabin plaque/i })).toHaveCount(
      0,
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
