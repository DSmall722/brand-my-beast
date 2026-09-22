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
  rejectListedMatchingBanRule,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import {
  addBanRule,
  resetOperatorBanListForTests,
} from "../src/lib/operator-ban-list";
import { panelBoardMarkFor, panelLegendLabel } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.27 — ban-list UI shows panel numbers blocked in the last run.
 * FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 16.27: ban-list last run shows panel numbers", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    resetOperatorBanListForTests();
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

  test("sweep records the board numbers, not only slugs", async () => {
    const door = panelBoardMarkFor("driver-door");
    const cover = panelBoardMarkFor("rear-bumper");
    expect(door.n).toBe(4);
    expect(cover.n).toBe(11);

    const first = await placeIntentBid({
      panelId: "driver-door",
      userId: "ban1627-door",
      brandLabel: "Glowban Door",
      tradeLabel: "door kits",
      standingUsd: 4500,
    });
    expect(first.ok).toBe(true);
    const second = await placeIntentBid({
      panelId: "rear-bumper",
      userId: "ban1627-cover",
      brandLabel: "Glowban Cover",
      tradeLabel: "cover kits",
      standingUsd: 900,
    });
    expect(second.ok).toBe(true);

    const added = await addBanRule({ pattern: "glowban", note: "slice 16.27" });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const sweep = await rejectListedMatchingBanRule(added.rule);
    expect(sweep.blockedPanelIds.sort()).toEqual(["driver-door", "rear-bumper"]);
    expect(sweep.rejectedIds).toHaveLength(2);
    expect(panelLegendLabel(door)).toBe("4 Driver Side Doors");
    expect(panelLegendLabel(cover)).toBe("11 Rear bumper");
  });

  test("operator UI lists the blocked panel numbers", async ({ page }) => {
    const door = panelLegendLabel(panelBoardMarkFor("driver-door"));
    const cover = panelLegendLabel(panelBoardMarkFor("rear-bumper"));

    await signIn(page, "bidder1627a@example.com");
    await page.goto("/panels/driver-door");
    await page.getByTestId("intent-brand").fill("Glowban Door");
    await page.getByTestId("intent-trade").fill("door kits");
    await page.getByTestId("intent-standing").fill("4500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await signIn(page, "bidder1627b@example.com");
    await page.goto("/panels/rear-bumper");
    await page.getByTestId("intent-brand").fill("Glowban Cover");
    await page.getByTestId("intent-trade").fill("cover kits");
    await page.getByTestId("intent-standing").fill("900");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await signIn(page, "operator@example.com");
    await page.goto("/operator/ban-list");
    await expect(page.getByTestId("ban-last-run-stored")).toHaveText(
      "No ban-list run yet.",
    );
    await page.getByTestId("ban-pattern").fill("glowban");
    await page.getByTestId("ban-submit").click();
    await expect(page.getByTestId("ban-success")).toContainText(
      "Hard-rejected",
      { timeout: 10_000 },
    );
    const lastRun = page.getByTestId("ban-last-run-panels");
    await expect(lastRun).toContainText(door);
    await expect(lastRun).toContainText(cover);
    await expect(lastRun).toContainText("Last run blocked");
    await expect(lastRun).not.toContainText("driver-door");
    await expect(lastRun).not.toContainText("rear-bumper");

    await page.reload();
    const stored = page.getByTestId("ban-last-run-stored");
    await expect(stored).toContainText(door);
    await expect(stored).toContainText(cover);
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
