import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 13.28 — /account/wins empty state from PUBLIC_COPY.
 */
test.describe("slice 13.28: wins empty state from PUBLIC_COPY", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

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
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const cfg = JSON.parse(raw) as {
      git?: { deploymentEnabled?: boolean | Record<string, boolean> };
    };
    expect(cfg.git?.deploymentEnabled).toBe(false);
  });

  test("PUBLIC_COPY.seat.winsEmpty matches PUBLIC_COPY.md", () => {
    const expected =
      "No approved seats yet. Operator approval on a listed intent opens this sheet. Still no card charge.";
    expect(PUBLIC_COPY.seat.winsEmpty).toBe(expected);
    expect(PUBLIC_COPY.hero.h1).toBe(
      "Put your brand on the truck people already photograph.",
    );

    const mdPath = join(process.cwd(), "PUBLIC_COPY.md");
    expect(existsSync(mdPath)).toBe(true);
    const md = readFileSync(mdPath, "utf8");
    expect(md).toContain("13.28");
    expect(md).toContain(expected);
    expect(expected.toLowerCase()).not.toMatch(/\blease\b/);
    expect(PUBLIC_COPY.seat.winsEmpty.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("/account/wins empty state uses PUBLIC_COPY.seat.winsEmpty", async ({
    page,
  }) => {
    await signIn(page, "bidder-b@example.com");
    await page.goto("/account/wins");
    await expect(page.getByTestId("winner-portal")).toBeVisible();
    await expect(page.getByTestId("winner-portal-empty")).toBeVisible();
    await expect(page.getByTestId("winner-portal-empty")).toHaveText(
      PUBLIC_COPY.seat.winsEmpty,
    );
    await expect(page.getByTestId("winner-portal-seats-list")).toHaveCount(0);

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT=");
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain(PUBLIC_COPY.hero.h1);
  });
});
