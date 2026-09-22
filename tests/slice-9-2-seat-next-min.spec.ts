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
import { minIncrementUsd, nextStandingUsd } from "../src/lib/intent";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 9.2 — seat shows next minimum from standing + increment.
 */
test.describe("slice 9.2: seat next minimum", () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

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

  test("open seat: min next equals opening; increment blank", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("seat-lead")).toContainText("Current Bid $2,500");
    await expect(page.getByTestId("panel-stats")).toHaveCount(0);
    await expect(page.getByTestId("seat-next-minimum-rule")).toHaveCount(0);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
  });

  test("held seat: min next = standing + max($250, 10%)", async ({ page }) => {
    const standingUsd = 2500;
    const increment = minIncrementUsd(standingUsd);
    const nextMin = nextStandingUsd(standingUsd);
    expect(increment).toBe(250);
    expect(nextMin).toBe(2750);

    await signIn(page, "slice92@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Next Min Co");
    await page.getByTestId("intent-trade").fill("next min snacks");
    await page.getByTestId("intent-standing").fill(String(standingUsd));
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await expect(page.getByTestId("seat-lead")).toContainText(
      `Current Bid ${formatUsd(standingUsd)}`,
    );
    await expect(page.getByTestId("panel-stats")).toHaveCount(0);
    await expect(page.getByTestId("seat-next-minimum-rule")).toHaveCount(0);
    await expect(page.getByTestId("intent-standing")).toHaveAttribute(
      "min",
      String(nextMin),
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("10% increment surfaces when larger than $250", async ({ page }) => {
    await signIn(page, "slice92-pct@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Percent Min Co");
    await page.getByTestId("intent-trade").fill("percent min tools");
    await page.getByTestId("intent-standing").fill("3000");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    expect(minIncrementUsd(3000)).toBe(300);
    expect(nextStandingUsd(3000)).toBe(3300);
    await expect(page.getByTestId("seat-lead")).toContainText("Current Bid $3,000");
    await expect(page.getByTestId("intent-standing")).toHaveAttribute(
      "min",
      "3300",
    );
    await expect(page.getByTestId("seat-next-minimum-rule")).toHaveCount(0);
  });
});
