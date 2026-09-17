import { expect, test, type Page } from "@playwright/test";
import { isOperatorEmail } from "../src/lib/auth/operator";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  formatLastDigestLabel,
  formatPendingCountLabel,
} from "../src/lib/operator-health";
import {
  formatWaitlistCountLabel,
  getLastOperatorDigestAt,
  recordOperatorDigestSentAt,
  resetLastOperatorDigestAtForTests,
} from "../src/lib/operator-status";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 13.45 — operator health: waitlist + pending + last digest.
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

test.describe("slice 13.45: operator health waitlist pending digest", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    resetLastOperatorDigestAtForTests();
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    resetLastOperatorDigestAtForTests();
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
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("unit: pending + digest labels and record helper", () => {
    expect(formatPendingCountLabel(0)).toBe("0 pending");
    expect(formatPendingCountLabel(2)).toBe("2 pending");
    expect(formatLastDigestLabel(null)).toBe("never");
    expect(formatLastDigestLabel("2026-09-17T00:00:00.000Z")).toBe(
      "2026-09-17T00:00:00.000Z",
    );
    expect(formatWaitlistCountLabel(0)).toBe("0 signups");
    expect(getLastOperatorDigestAt()).toBeNull();
    recordOperatorDigestSentAt("2026-09-17T12:00:00.000Z");
    expect(getLastOperatorDigestAt()).toBe("2026-09-17T12:00:00.000Z");
  });

  test("operator health shows waitlist, pending, last digest; home has no link", async ({
    page,
    request,
  }) => {
    expect(isOperatorEmail("operator@example.com")).toBe(true);

    const stamp = Date.now();
    const waitRes = await request.post("/api/waitlist", {
      data: { email: `health-wl-${stamp}@example.com` },
    });
    expect(waitRes.status()).toBe(201);

    await signIn(page, `health-bidder-${stamp}@example.com`);
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill(`Health Brand ${stamp}`);
    await page.getByTestId("intent-trade").fill("health tools");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    const digestRes = await request.get("/api/cron/operator-digest", {
      headers: { authorization: "Bearer playwright-cron-secret" },
    });
    expect(digestRes.ok()).toBeTruthy();
    const digestJson = (await digestRes.json()) as {
      ok: boolean;
      digest: { generatedAt: string };
    };
    expect(digestJson.ok).toBe(true);
    const expectedDigest = digestJson.digest.generatedAt;
    expect(expectedDigest).toBeTruthy();

    await signIn(page, "operator@example.com");
    await page.goto("/operator/health");
    await expect(page.getByTestId("operator-health")).toBeVisible();

    const waitlistText = await page
      .getByTestId("operator-health-waitlist-count")
      .innerText();
    expect(waitlistText).toMatch(/^\d+ signup/);
    expect(Number(waitlistText.match(/^(\d+)/)?.[1])).toBeGreaterThanOrEqual(1);

    const pendingText = await page
      .getByTestId("operator-health-pending-count")
      .innerText();
    expect(pendingText).toMatch(/^\d+ pending$/);
    expect(Number(pendingText.match(/^(\d+)/)?.[1])).toBeGreaterThanOrEqual(1);

    await expect(page.getByTestId("operator-health-last-digest")).toHaveText(
      expectedDigest,
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);

    await page.goto("/");
    await expect(page.getByTestId("operator-health-link")).toHaveCount(0);
    await expect(page.locator('a[href="/operator/health"]')).toHaveCount(0);
  });
});
