import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function resetServerIntents(request: APIRequestContext) {
  const res = await request.post("/api/test/reset-intents");
  expect(res.ok()).toBeTruthy();
}

/**
 * Slice 8.7 — partner shop: approved seats + art only. No public header link.
 */
test.describe("slice 8.7: partner shop approved seats + art", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
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

  test("public homepage has no wrap-shop header link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("shop-nav-link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /wrap shop/i })).toHaveCount(0);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
  });

  test("shop sheet shows approved art and no panel matrix", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("ArtSeatCo");
    await page.getByTestId("intent-trade").fill("art seats");
    await page.getByTestId("intent-standing").fill("2500");
    await page
      .getByTestId("intent-artwork-url")
      .fill("https://cdn.example.com/art-seat.svg");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText("ArtSeatCo");
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "shop@example.com");
    await page.goto("/partner/shop");
    await expect(page.getByTestId("partner-shop")).toBeVisible();
    await expect(page.getByTestId("wrap-shop-matrix")).toHaveCount(0);
    await expect(page.getByTestId("wrap-shop-approved-list")).toContainText(
      "ArtSeatCo",
    );
    await expect(page.getByTestId(/^intent-artwork-thumb-/).first()).toHaveAttribute(
      "src",
      "https://cdn.example.com/art-seat.svg",
    );
    await expect(page.getByTestId("shop-nav-link")).toBeVisible();

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
  });
});
