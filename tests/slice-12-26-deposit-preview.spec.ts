import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  depositPreviewCopy,
  tryDepositPreviewCopy,
} from "../src/lib/deposit-preview";
import { depositUsdForMark } from "../src/lib/intent";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 12.26 — deposit preview on the seat:
 * “20% of this mark is $X. Not charged.”
 */
test.describe("slice 12.26: seat deposit preview", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(DEPOSIT_PERCENT).toBe(20);
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

  test("depositPreviewCopy matches helper math and exact wording", () => {
    expect(depositPreviewCopy(2500)).toBe(
      "20% of this mark is $500. Not charged.",
    );
    expect(depositPreviewCopy(1001)).toBe(
      `20% of this mark is ${formatUsd(depositUsdForMark(1001))}. Not charged.`,
    );
    expect(tryDepositPreviewCopy(0)).toBeNull();
    expect(tryDepositPreviewCopy(-1)).toBeNull();
  });

  test("seat form shows live 20% preview as the mark changes", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-bid-form")).toBeVisible();

    const preview = page.getByTestId("intent-deposit-preview");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveText("20% of this mark is $500. Not charged.");

    await page.getByTestId("intent-standing").fill("3000");
    await expect(preview).toHaveText("20% of this mark is $600. Not charged.");
    await expect(preview).toHaveAttribute("data-deposit-mark", "3000");

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
