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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  depositPreviewCopy,
  tryDepositPreviewCopy,
} from "../src/lib/deposit-preview";
import { depositUsdForMark } from "../src/lib/intent";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";

/**
 * Slice 14.33 — Deposit preview uses the same helper as 12.5
 * (depositUsdForMark). CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

const ROOT = process.cwd();

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 14.33: deposit preview uses depositUsdForMark (12.5)", () => {
  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(DEPOSIT_PERCENT).toBe(20);
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

  test("deposit-preview and panel page call depositUsdForMark only", () => {
    const preview = readFileSync(
      join(ROOT, "src/lib/deposit-preview.ts"),
      "utf8",
    );
    expect(preview).toContain("Slice 14.33");
    expect(preview).toContain("depositUsdForMark");
    expect(preview).toMatch(/from ["']\.\/intent["']/);
    expect(preview).not.toMatch(/Math\.(ceil|round|floor)\([^)]*0\.2/);
    expect(preview).not.toMatch(/\*\s*0\.2\b/);
    expect(preview).not.toMatch(/standingUsd\s*\*\s*/);

    const form = readFileSync(
      join(ROOT, "src/components/IntentBidForm.tsx"),
      "utf8",
    );
    expect(form).toContain("tryDepositPreviewCopy");
    expect(form).not.toMatch(/Math\.(ceil|round|floor)\([^)]*0\.2/);
    expect(form).not.toMatch(/standingUsd\s*\*\s*0\.2/);

    const panel = readFileSync(
      join(ROOT, "src/app/panels/[panelId]/page.tsx"),
      "utf8",
    );
    expect(panel).toContain("depositUsdForMark");
    expect(panel).toContain("panel-deposit-shown");
    expect(panel).not.toMatch(/standing\s*\*\s*0\.2/);
    expect(panel.toLowerCase()).not.toMatch(/\blease\b/);

    expect(depositUsdForMark(2500)).toBe(500);
    expect(depositPreviewCopy(2500)).toContain(formatUsd(500));
    expect(tryDepositPreviewCopy(2500)).toBe(depositPreviewCopy(2500));
  });

  test("seat form + panel deposit shown match depositUsdForMark", async ({
    page,
  }) => {
    await signIn(page, "deposit1433@example.com");
    await page.goto("/panels/hood");

    const opening = 2500;
    const expected = depositUsdForMark(opening);
    expect(expected).toBe(500);

    const panelDeposit = page.getByTestId("panel-deposit-shown");
    await expect(panelDeposit).toContainText(`${DEPOSIT_PERCENT}%`);
    await expect(panelDeposit).toContainText(formatUsd(expected));
    await expect(panelDeposit).toContainText("not charged");

    await expect(page.getByTestId("intent-bid-form")).toBeVisible();
    const preview = page.getByTestId("intent-deposit-preview");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute(
      "data-deposit-mark",
      String(opening),
    );
    await expect(preview).toHaveText(depositPreviewCopy(opening));

    await page.getByTestId("intent-standing").fill("1001");
    await expect(preview).toHaveAttribute("data-deposit-mark", "1001");
    await expect(preview).toHaveText(depositPreviewCopy(1001));
    expect(depositPreviewCopy(1001)).toContain(
      formatUsd(depositUsdForMark(1001)),
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
