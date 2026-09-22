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

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 10.2 — seat compositor renders the standing brand, not only a typed preview.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.2: compositor standing brand", () => {
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

  test("open seat compositor says Open seat; listed brand paints the face", async ({
    browser,
  }) => {
    const open = await browser.newPage();
    await open.goto("/panels/hood");
    await expect(open.getByTestId("compositor-standing-brand")).toHaveCount(0);
    await expect(open.getByText("Open seat", { exact: true })).toHaveCount(0);
    await open.close();

    const bidder = await browser.newPage();
    await signIn(bidder, "comp102@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Steel Face Co");
    await bidder.getByTestId("intent-trade").fill("compositor snacks");
    await bidder.getByTestId("intent-standing").fill("2500");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await expect(bidder.getByTestId("compositor-standing-brand")).toHaveCount(0);
    await expect(bidder.getByTestId("public-standing-brand")).toHaveText(
      "Steel Face Co",
    );
    await bidder.close();

    const visitor = await browser.newPage();
    await visitor.goto("/panels/hood");
    await expect(visitor.getByTestId("compositor-standing-brand")).toHaveCount(0);
    await expect(visitor.getByTestId("public-standing-brand")).toHaveText(
      "Steel Face Co",
    );
    const html = await visitor.content();
    expect(html).not.toContain("comp102@example.com");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    await visitor.close();
  });
});
