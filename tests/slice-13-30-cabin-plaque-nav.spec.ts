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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 13.30 — Cabin plaque form / nav stay dark while TRUCK_EXISTS is false.
 * Authenticated chrome (/account, SiteChrome, AuthNav, HomeHeader) must not
 * surface the plaque form. CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

const AUTH_CHROME = [
  "src/components/AuthNav.tsx",
  "src/components/SiteChrome.tsx",
  "src/components/home/HomeHeader.tsx",
  "src/app/account/page.tsx",
  "src/app/account/wins/page.tsx",
] as const;

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

test.describe("slice 13.30: cabin plaque off auth nav while truck missing", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("cabinPlaqueUiAllowed follows TRUCK_EXISTS", () => {
    expect(TRUCK_EXISTS).toBe(false);
    expect(cabinPlaqueUiAllowed(false)).toBe(false);
    expect(cabinPlaqueUiAllowed(true)).toBe(true);
    expect(cabinPlaqueUiAllowed()).toBe(false);
  });

  test("authenticated chrome sources omit cabin plaque form and nav", () => {
    for (const rel of AUTH_CHROME) {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      for (const needle of PLAQUE_NAV_NEEDLES) {
        expect(src, `${rel} must not contain ${needle}`).not.toContain(needle);
      }
    }
  });

  test("CabinPlaqueForm gates on cabinPlaqueUiAllowed", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/CabinPlaqueForm.tsx"),
      "utf8",
    );
    expect(src).toContain("cabinPlaqueUiAllowed");
    expect(src).toMatch(/if\s*\(\s*!cabinPlaqueUiAllowed\(\)\s*\)/);
  });

  test("signed-in /account and home have no cabin plaque form", async ({
    page,
  }) => {
    expect(TRUCK_EXISTS).toBe(false);
    await signIn(page, "bidder-a@example.com");

    await expect(page.getByTestId("cabin-plaque-form")).toHaveCount(0);
    await expect(page.getByTestId("cabin-plaque")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /cabin plaque/i })).toHaveCount(
      0,
    );
    const accountHtml = (await page.content()).toLowerCase();
    expect(accountHtml).not.toMatch(/\blease\b/);
    expect(accountHtml).toContain("$58,000");
    expect(accountHtml).toContain("$120,000");

    await page.goto("/");
    await expect(page.getByTestId("cabin-plaque-form")).toHaveCount(0);
    await expect(page.getByTestId("cabin-plaque")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /cabin plaque/i })).toHaveCount(
      0,
    );
    await expect(page.getByTestId("auth-nav")).toBeVisible();
  });
});
