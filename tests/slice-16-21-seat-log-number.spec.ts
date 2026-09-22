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
import { panelBoardMarkFor, panelLegendLabel } from "../src/lib/panel-board";
import { buildPublicSeatLog, formatSeatLogTime } from "../src/lib/seat-log";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.21 — public seat log shows panel number, amount, and ET time.
 * No bidder email. FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

const PANEL_ID = "rear-bumper" as const;

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 16.21: seat log shows panel number", () => {
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
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("unit: seat log row carries the board number, amount, and ET", async () => {
    const mark = panelBoardMarkFor(PANEL_ID);
    const placed = await placeIntentBid({
      panelId: PANEL_ID,
      userId: "seat1621-secret-user",
      brandLabel: "Number Log Co",
      tradeLabel: "number tools",
      standingUsd: 900,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const row = buildPublicSeatLog([placed.bid])[0];
    expect(row?.panelNumber).toBe(mark.n);
    expect(row?.panelNumberLabel).toBe(panelLegendLabel(mark));
    expect(row?.amountLabel).toBe(formatUsd(900));
    expect(row?.timeLabel).toBe(formatSeatLogTime(placed.bid.createdAt));
    expect(row?.timeLabel).toMatch(/\bET\b/);
    const serialized = JSON.stringify(row);
    expect(serialized).not.toContain("seat1621-secret-user");
    expect(serialized).not.toContain("@");
    expect(serialized.toLowerCase()).not.toContain("email");
  });

  test("panel seat log shows number, amount, and ET", async ({ page }) => {
    const mark = panelBoardMarkFor(PANEL_ID);
    await signIn(page, "seat1621@example.com");
    await page.goto(`/panels/${PANEL_ID}`);
    await page.getByTestId("intent-brand").fill("Number UI Brand");
    await page.getByTestId("intent-trade").fill("number ui trade");
    await page.getByTestId("intent-standing").fill("900");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await expect(page.getByTestId("public-seat-log")).toContainText(
      "Bid Activity",
    );
    await expect(page.getByTestId("public-seat-log-lead")).toHaveCount(0);

    const row = page.locator('[data-testid^="seat-log-row-"]').first();
    await expect(row).toBeVisible();
    const bidId = (await row.getAttribute("data-testid"))!.replace(
      "seat-log-row-",
      "",
    );
    await expect(page.getByTestId(`seat-log-number-${bidId}`)).toHaveText(
      panelLegendLabel(mark),
    );
    await expect(page.getByTestId(`seat-log-amount-${bidId}`)).toHaveText(
      "$900",
    );
    const timeText = (
      await page.getByTestId(`seat-log-time-${bidId}`).textContent()
    )?.trim();
    expect(timeText).toMatch(/\bET\b/);

    const html = await page.content();
    expect(html).not.toContain("seat1621@example.com");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
