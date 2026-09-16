import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  OPERATOR_DECIDE_RATE_LIMITED,
  checkOperatorDecideRateLimit,
  configureRateLimitForTests,
  resetRateLimitForTests,
} from "../src/lib/rate-limit";

/**
 * Slice 13.33 — rate-limit operator approve/reject.
 * Never claims a decision landed. CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function configureOperatorDecide(
  request: APIRequestContext,
  operatorDecideMax: number,
) {
  const res = await request.post("/api/test/rate-limit", {
    data: {
      configure: {
        waitlistMax: 60,
        intentMax: 60,
        operatorDecideMax,
        windowMs: 60_000,
      },
    },
  });
  expect(res.ok()).toBeTruthy();
}

async function resetLimits(request: APIRequestContext) {
  const res = await request.post("/api/test/rate-limit", {
    data: { reset: true },
  });
  expect(res.ok()).toBeTruthy();
}

test.describe("slice 13.33: rate-limit operator approve/reject", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async ({ request }) => {
    await resetLimits(request);
    await request.post("/api/test/reset-intents");
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
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("unit: operator-decide copy never claims a decision; limiter trips", () => {
    expect(OPERATOR_DECIDE_RATE_LIMITED.toLowerCase()).toContain(
      "no approve or reject was recorded",
    );
    expect(OPERATOR_DECIDE_RATE_LIMITED.toLowerCase()).not.toMatch(
      /\bapproved\b/,
    );
    expect(OPERATOR_DECIDE_RATE_LIMITED.toLowerCase()).not.toMatch(
      /\brejected\b/,
    );
    configureRateLimitForTests({
      waitlistMax: 60,
      intentMax: 60,
      operatorDecideMax: 2,
      windowMs: 60_000,
    });
    expect(checkOperatorDecideRateLimit("operator@example.com").ok).toBe(true);
    expect(checkOperatorDecideRateLimit("operator@example.com").ok).toBe(true);
    expect(checkOperatorDecideRateLimit("operator@example.com").ok).toBe(false);
    resetRateLimitForTests();

    const actionSrc = readFileSync(
      join(process.cwd(), "src/app/actions/intent.ts"),
      "utf8",
    );
    expect(actionSrc).toContain("checkOperatorDecideRateLimit");
    expect(actionSrc).toContain("OPERATOR_DECIDE_RATE_LIMITED");
  });

  test("operator UI shows rate-limit after ceiling", async ({
    page,
    request,
  }) => {
    await request.post("/api/test/reset-intents");
    await configureOperatorDecide(request, 1);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Rate Limit Co");
    await page.getByTestId("intent-trade").fill("rate limit tools");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await page.goto("/panels/tailgate");
    await page.getByTestId("intent-brand").fill("Rate Limit Co");
    await page.getByTestId("intent-trade").fill("rate limit tools");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("operator-approvals")).toBeVisible();
    await expect(page.getByTestId("approvals-list")).toContainText(
      "Rate Limit Co",
    );

    await page
      .locator('[data-testid^="approval-note-"]')
      .first()
      .fill("First decision in window.");
    await page.locator('[data-testid^="reject-"]').first().click();
    await expect(page.getByTestId("approvals-decided")).toContainText(
      "Rate Limit Co",
      { timeout: 10_000 },
    );

    await page
      .locator('[data-testid^="approval-note-"]')
      .first()
      .fill("Should be rate limited.");
    await page.locator('[data-testid^="reject-"]').first().click();
    await expect(
      page.locator('[data-testid^="approval-error-"]').first(),
    ).toHaveText(OPERATOR_DECIDE_RATE_LIMITED);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
