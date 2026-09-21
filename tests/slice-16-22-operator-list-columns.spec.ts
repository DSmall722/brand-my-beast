import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { intentStatusLabel } from "../src/lib/intent-labels";
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { panelBoardMarkFor } from "../src/lib/panel-board";
import {
  OPERATOR_LIST_COLUMN_KEYS,
  operatorListColumns,
} from "../src/lib/operator-list-columns";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.22 — operator list columns: #, panel, brand, trade, amount, status.
 * FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

const PANEL_ID = "driver-door" as const;

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 16.22: operator list columns", () => {
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

  test("column order is number, panel, brand, trade, amount, status", async () => {
    const mark = panelBoardMarkFor(PANEL_ID);
    const placed = await placeIntentBid({
      panelId: PANEL_ID,
      userId: "ops1622-secret-user",
      brandLabel: "Column Brand",
      tradeLabel: "column trade",
      standingUsd: 4500,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const columns = operatorListColumns(placed.bid);
    expect(columns.map((column) => column.key)).toEqual([
      ...OPERATOR_LIST_COLUMN_KEYS,
    ]);
    expect(columns).toEqual([
      { key: "#", value: String(mark.n) },
      { key: "panel", value: mark.name },
      { key: "brand", value: "Column Brand" },
      { key: "trade", value: "column trade" },
      { key: "amount", value: formatUsd(4500) },
      { key: "status", value: intentStatusLabel(placed.bid.status) },
    ]);
    expect(JSON.stringify(columns)).not.toContain("ops1622-secret-user");
    expect(JSON.stringify(columns)).not.toContain("@");
  });

  test("operator pending list shows the six columns", async ({ page }) => {
    const mark = panelBoardMarkFor(PANEL_ID);
    await signIn(page, "bidder1622@example.com");
    await page.goto(`/panels/${PANEL_ID}`);
    await page.getByTestId("intent-brand").fill("Column UI Brand");
    await page.getByTestId("intent-trade").fill("column ui trade");
    await page.getByTestId("intent-standing").fill("4500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await signIn(page, "ops1622@example.com");
    await page.goto("/operator");
    const row = page.locator('[data-testid^="approval-row-"]').first();
    await expect(row).toBeVisible();
    const bidId = (await row.getAttribute("data-testid"))!.replace(
      "approval-row-",
      "",
    );
    const columns = page.getByTestId(`operator-columns-${bidId}`);
    await expect(columns.locator("dt")).toHaveText([
      ...OPERATOR_LIST_COLUMN_KEYS,
    ]);
    await expect(page.getByTestId(`operator-col-#-${bidId}`)).toHaveText(
      String(mark.n),
    );
    await expect(page.getByTestId(`operator-col-panel-${bidId}`)).toHaveText(
      mark.name,
    );
    await expect(page.getByTestId(`operator-col-brand-${bidId}`)).toHaveText(
      "Column UI Brand",
    );
    await expect(page.getByTestId(`operator-col-trade-${bidId}`)).toHaveText(
      "column ui trade",
    );
    await expect(page.getByTestId(`operator-col-amount-${bidId}`)).toHaveText(
      "$4,500",
    );
    await expect(page.getByTestId(`operator-col-status-${bidId}`)).toHaveText(
      "Listed",
    );

    const html = await page.content();
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("bidder1622@example.com");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
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
