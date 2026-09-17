import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { resetWaitlistStoreForTests } from "../src/lib/waitlist";

/**
 * Slice 14.43 — Playwright journey:
 * waitlist → sign-in (test) → hood intent → approve → /account/wins.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();
const JOURNEY_EMAIL = "journey-1443@example.com";
const JOURNEY_BRAND = "Journey Wins Co";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 14.43: journey waitlist → wins", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.WAITLIST_MODE = "memory";
    process.env.INTENT_MODE = "memory";
    resetWaitlistStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    resetWaitlistStoreForTests();
    await request.post("/api/test/reset-intents");
  });

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

  test("journey: waitlist → sign-in → hood intent → approve → /account/wins", async ({
    page,
  }) => {
    // 1) Waitlist on homepage
    await page.goto("/");
    await expect(page.getByTestId("waitlist-form")).toBeVisible();
    await page.getByTestId("waitlist-email").fill(JOURNEY_EMAIL);
    await page.getByTestId("waitlist-submit").click();
    await expect(page.getByTestId("waitlist-status")).toContainText(
      PUBLIC_COPY.waitlist.success.slice(0, 12),
      { timeout: 10_000 },
    );

    // 2) Sign-in (test mode)
    await signIn(page, JOURNEY_EMAIL);

    // 3) Hood intent
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill(JOURNEY_BRAND);
    await page.getByTestId("intent-trade").fill("journey trade");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    // 4) Operator approve
    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText(JOURNEY_BRAND);
    const finishSelect = page.locator('[data-testid^="approval-finish-select-"]').first();
    if ((await finishSelect.count()) > 0) {
      await finishSelect.selectOption("wrap");
    }
    await page.locator('[data-testid^="approve-"]').first().click();
    const approvalError = page.locator('[data-testid^="approval-error-"]').first();
    if ((await approvalError.count()) > 0) {
      const errText = (await approvalError.textContent())?.trim();
      expect(errText, `approve failed: ${errText}`).toBeFalsy();
    }
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 15_000,
    });

    // 5) Bidder sees win on /account/wins
    await signIn(page, JOURNEY_EMAIL);
    await page.goto("/account/wins");
    await expect(page.getByTestId("winner-portal")).toBeVisible();
    await expect(page.getByTestId("winner-portal-seats-list")).toContainText(
      JOURNEY_BRAND,
    );
    const seats = page.locator('[data-testid^="winner-seat-"]');
    await expect(seats).toHaveCount(1);
    await expect(seats.first()).toHaveAttribute("data-status", "approved");

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(CLOSE_AT).toBeNull();
  });
});
