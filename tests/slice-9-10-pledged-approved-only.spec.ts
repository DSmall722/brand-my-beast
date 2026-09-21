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
import {
  loadBoardIntentStats,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 9.10 — Playwright: pledged dollars = sum of approved standing only.
 * Listed does not count. CLOSE_AT null. No Stripe.
 */
test.describe("slice 9.10: pledged = approved standing only", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
    await resetIntentStoreForTests();
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

  test("unit: listed does not pledge; approved sums standing only", async () => {
    const empty = await loadBoardIntentStats();
    expect(empty.pledgedUsd).toBe(0);

    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "p910-listed",
      brandLabel: "Listed Only Co",
      tradeLabel: "listed only snacks",
      standingUsd: 3000,
    });
    expect(listed.ok).toBeTruthy();
    if (!listed.ok) return;

    const afterListed = await loadBoardIntentStats();
    expect(afterListed.pledgedUsd).toBe(0);

    const approved = await setIntentStatus(listed.bid.id, "approved");
    expect(approved.ok).toBeTruthy();

    const afterOne = await loadBoardIntentStats();
    expect(afterOne.pledgedUsd).toBe(3000);

    const secondListed = await placeIntentBid({
      panelId: "driver-door",
      userId: "p910-door",
      brandLabel: "Door Listed Co",
      tradeLabel: "door listed tools",
      standingUsd: 4500,
    });
    expect(secondListed.ok).toBeTruthy();
    if (!secondListed.ok) return;

    // Second panel listed but not approved — pledged stays 3000.
    expect((await loadBoardIntentStats()).pledgedUsd).toBe(3000);

    const secondApproved = await setIntentStatus(
      secondListed.bid.id,
      "approved",
    );
    expect(secondApproved.ok).toBeTruthy();
    expect((await loadBoardIntentStats()).pledgedUsd).toBe(5500);
  });

  test("homepage raised-amount ignores listed until approved", async ({
    browser,
  }) => {
    const home = await browser.newPage();
    await home.goto("/");
    await expect(home.getByTestId("raised-amount")).toHaveText("$0");
    await home.close();

    const bidder = await browser.newPage();
    await signIn(bidder, "p910-ui@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Pledged UI Co");
    await bidder.getByTestId("intent-trade").fill("pledged ui tools");
    await bidder.getByTestId("intent-standing").fill("3000");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await bidder.close();

    const stillZero = await browser.newPage();
    await stillZero.goto("/");
    await expect(stillZero.getByTestId("raised-amount")).toHaveText("$0");
    const zeroHtml = await stillZero.content();
    expect(zeroHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(zeroHtml).not.toContain("CLOSE_AT");
    await stillZero.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Pledged UI Co",
    );
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operator.close();

    const raised = await browser.newPage();
    await raised.goto("/");
    await expect(raised.getByTestId("raised-amount")).toHaveText("$3,000");
    const html = await raised.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    await raised.close();
  });
});
