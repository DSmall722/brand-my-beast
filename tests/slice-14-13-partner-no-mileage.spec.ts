import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 14.13 — `/partner` has no weekly mileage ledger or city time-in-market
 * heatmap cards. CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();
const PARTNER_APP = join(ROOT, "src/app/partner");
const PARTNER_API = join(ROOT, "src/app/api/partner");
const WRAP_SHEET = join(ROOT, "src/components/WrapShopSheet.tsx");

const MILEAGE_HEATMAP_NEEDLES = [
  "WeeklyMileageLedgerCard",
  "CityTimeHeatmapCard",
  "weekly-mileage-ledger",
  "city-time-heatmap",
  "weekly-mileage-ledger.ts",
  "city-time-heatmap.ts",
  "@/lib/weekly-mileage-ledger",
  "@/lib/city-time-heatmap",
  "Weekly mileage ledger",
  "City time-in-market heatmap",
] as const;

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 14.13: /partner has no mileage / heatmap cards", () => {
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

  test("partner app, API, and WrapShopSheet omit mileage / heatmap modules", () => {
    const files = [
      ...listSourceFiles(PARTNER_APP),
      ...listSourceFiles(PARTNER_API),
      WRAP_SHEET,
    ];
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const needle of MILEAGE_HEATMAP_NEEDLES) {
        if (src.includes(needle)) {
          offenders.push(`${relative(ROOT, file)} → ${needle}`);
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  test("signed-in /partner/shop has no mileage or heatmap cards", async ({
    page,
  }) => {
    await signIn(page, "shop@example.com");
    await page.goto("/partner/shop");
    await expect(page.getByTestId("partner-shop")).toBeVisible();
    await expect(page.getByTestId("wrap-shop-sheet")).toBeVisible();
    await expect(page.getByTestId("weekly-mileage-ledger")).toHaveCount(0);
    await expect(page.getByTestId("city-time-heatmap")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /weekly mileage ledger/i }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: /city time-in-market heatmap/i }),
    ).toHaveCount(0);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
