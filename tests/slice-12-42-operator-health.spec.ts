import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { isOperatorEmail } from "../src/lib/auth/operator";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  lastDrizzleMigrationName,
  lastDrizzleMigrationTag,
  listDrizzleMigrationFiles,
} from "../src/lib/drizzle-migrations";

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 12.42 — /operator/health last-migration name from Drizzle.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.42: operator health last Drizzle migration", () => {
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

  test("drizzle helper returns highest-numbered SQL migration", () => {
    const files = listDrizzleMigrationFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toMatch(/^0001_/);
    const last = lastDrizzleMigrationName();
    expect(last).toBe(files.at(-1)!);
    expect(last).toMatch(/\.sql$/);
    expect(lastDrizzleMigrationTag()).toBe(last!.replace(/\.sql$/i, ""));
  });

  test("operator health page shows last migration; home has no link", async ({
    page,
  }) => {
    expect(isOperatorEmail("operator@example.com")).toBe(true);
    const expected = lastDrizzleMigrationTag();
    expect(expected).toBeTruthy();

    await signIn(page, "operator@example.com");
    await page.goto("/operator/health");
    await expect(page.getByTestId("operator-health")).toBeVisible();
    await expect(page.getByTestId("operator-health-migration")).toHaveText(
      expected!,
    );
    await expect(
      page.getByTestId("operator-health-migration-file"),
    ).toHaveText(`${expected}.sql`);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);

    await page.goto("/");
    await expect(page.getByTestId("operator-health-link")).toHaveCount(0);
    await expect(page.locator('a[href="/operator/health"]')).toHaveCount(0);
  });
});
