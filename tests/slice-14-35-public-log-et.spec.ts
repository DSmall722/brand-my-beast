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
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  SEAT_LOG_TIME_ZONE,
  buildPublicSeatLog,
  formatSeatLogTime,
} from "../src/lib/seat-log";

/**
 * Slice 14.35 — Public log timestamps are America/New_York, labeled ET.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
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

test.describe("slice 14.35: public seat log timestamps America/New_York ET", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
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

  test("formatSeatLogTime uses America/New_York and labels ET", () => {
    expect(SEAT_LOG_TIME_ZONE).toBe("America/New_York");
    // Midday UTC in September → morning Eastern (EDT).
    expect(formatSeatLogTime("2026-09-16T12:34:56.789Z")).toBe(
      "Sep 16, 2026, 8:34 AM ET",
    );
    // January UTC → EST (UTC-5).
    expect(formatSeatLogTime("2026-01-15T17:00:00.000Z")).toBe(
      "Jan 15, 2026, 12:00 PM ET",
    );
    expect(formatSeatLogTime("2026-09-16T12:34:56.789Z")).toMatch(/\bET\b/);
    expect(formatSeatLogTime("2026-09-16T12:34:56.789Z")).not.toMatch(/Z$/);

    const src = readFileSync(join(ROOT, "src/lib/seat-log.ts"), "utf8");
    expect(src).toContain("Slice 14.35");
    expect(src).toContain("America/New_York");
    expect(src).toContain('timeZone: SEAT_LOG_TIME_ZONE');
    expect(src).toMatch(/ET`/);
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("public seat log UI shows ET times", async ({ page }) => {
    // Use roof (not hood) so parallel 9.9 hood marks do not collide.
    const placed = await placeIntentBid({
      panelId: "roof",
      userId: "et1435-user",
      brandLabel: "ET Log Co",
      tradeLabel: "et snacks",
      standingUsd: 800,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const expected = formatSeatLogTime(placed.bid.createdAt);
    expect(expected).toMatch(/\bET\b/);
    expect(buildPublicSeatLog([placed.bid])[0]?.timeLabel).toBe(expected);

    await signIn(page, "et1435@example.com");
    await page.goto("/panels/roof");
    await page.getByTestId("intent-brand").fill("ET UI Brand");
    await page.getByTestId("intent-trade").fill("et ui trade");
    await page.getByTestId("intent-standing").fill("900");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await expect(page.getByTestId("public-seat-log")).toBeVisible();
    await expect(page.getByTestId("public-seat-log-lead")).toContainText("ET");
    const row = page.locator('[data-testid^="seat-log-row-"]').first();
    await expect(row).toBeVisible();
    const bidId = (await row.getAttribute("data-testid"))!.replace(
      "seat-log-row-",
      "",
    );
    const timeText = (
      await page.getByTestId(`seat-log-time-${bidId}`).textContent()
    )?.trim();
    expect(timeText).toMatch(/\bET\b/);
    expect(timeText).not.toMatch(/Z$/);
    await expect(page.getByTestId(`intent-time-${bidId}`)).toHaveText(
      timeText!,
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
