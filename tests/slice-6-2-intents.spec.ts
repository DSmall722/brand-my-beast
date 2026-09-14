import { expect, test } from "@playwright/test";
import {
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  assertIntentOnly,
  minIncrementUsd,
  nextStandingUsd,
} from "../src/lib/intent";
import {
  listBidsForPanel,
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 6.2 — merge-gate Playwright contract for intent create / outbid /
 * exclusivity / increment. Broader coverage lives in intent.spec + intent-ui;
 * this file is the standing Wave 6 proof.
 */
test.describe("slice 6.2: intent create / outbid / exclusivity / increment", () => {
  test.beforeEach(async ({ request }) => {
    await resetIntentStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("money fences and increment math stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
    expect(minIncrementUsd(1000)).toBe(250);
    expect(minIncrementUsd(3000)).toBe(300);
    expect(nextStandingUsd(2500)).toBe(2750);
    expect(nextStandingUsd(3000)).toBe(3300);
  });

  test("creates an intent, outbids it, and enforces exclusivity + increment", async () => {
    const created = await placeIntentBid({
      panelId: "hood",
      userId: "slice62_holder",
      brandLabel: "Slice Sixty Two Hold",
      tradeLabel: "Trail Snacks",
      standingUsd: 2500,
    });
    expect(created.ok).toBeTruthy();
    if (!created.ok) return;
    assertIntentOnly(created.bid);
    expect(created.bid.status).toBe("listed");
    expect(created.bid.standingUsd).toBe(2500);

    const elsewhere = await placeIntentBid({
      panelId: "tonneau",
      userId: "slice62_elsewhere",
      brandLabel: "Slice Sixty Two Elsewhere",
      tradeLabel: "trail snacks",
      standingUsd: 800,
    });
    expect(elsewhere.ok).toBeFalsy();
    if (elsewhere.ok) return;
    expect(elsewhere.error).toMatch(/one brand per trade|already held/i);

    const tooLow = await placeIntentBid({
      panelId: "hood",
      userId: "slice62_low",
      brandLabel: "Slice Sixty Two Low",
      tradeLabel: "Trail Tools",
      standingUsd: nextStandingUsd(created.bid.standingUsd) - 1,
    });
    expect(tooLow.ok).toBeFalsy();
    if (tooLow.ok) return;
    expect(tooLow.error).toMatch(/at least 2750/i);

    const challenger = await placeIntentBid({
      panelId: "hood",
      userId: "slice62_challenger",
      brandLabel: "Slice Sixty Two Challenger",
      tradeLabel: "Trail Tools",
      standingUsd: nextStandingUsd(created.bid.standingUsd),
    });
    expect(challenger.ok).toBeTruthy();
    if (!challenger.ok) return;
    assertIntentOnly(challenger.bid);
    expect(challenger.bid.status).toBe("listed");
    expect(challenger.bid.standingUsd).toBe(2750);

    const listed = await listBidsForPanel("hood");
    expect(listed.find((row) => row.id === created.bid.id)?.status).toBe(
      "outbid",
    );
    expect(listed.find((row) => row.id === challenger.bid.id)?.status).toBe(
      "listed",
    );
  });

  test("seat UI: create, reject low increment + foreign trade, accept outbid", async ({
    browser,
  }) => {
    const holder = await browser.newPage();
    await signIn(holder, "slice62-ui-holder@example.com");
    await holder.goto("/panels/hood");
    await expect(holder.getByTestId("intent-increment-rule")).toContainText(
      "standing + max($250, 10%)",
    );
    await expect(holder.getByTestId("seat-exclusivity")).toBeVisible();
    await holder.getByTestId("intent-brand").fill("Slice Sixty Two UI Hold");
    await holder.getByTestId("intent-trade").fill("Circuit Snacks");
    await holder.getByTestId("intent-standing").fill("2500");
    await holder.getByTestId("intent-submit").click();
    await expect(holder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    const holderHtml = await holder.content();
    expect(holderHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(holderHtml).not.toContain("CLOSE_AT");
    await holder.close();

    const low = await browser.newPage();
    await signIn(low, "slice62-ui-low@example.com");
    await low.goto("/panels/hood");
    await expect(low.getByTestId("panel-standing")).toContainText("2,500");
    await expect(low.getByTestId("panel-minimum")).toContainText("2,750");
    await low.getByTestId("intent-brand").fill("Slice Sixty Two UI Low");
    await low.getByTestId("intent-trade").fill("Circuit Tools");
    await low
      .getByTestId("intent-standing")
      .evaluate((el: HTMLInputElement) => {
        el.removeAttribute("min");
      });
    await low.getByTestId("intent-standing").fill("2749");
    await low.getByTestId("intent-submit").click();
    await expect(low.getByTestId("intent-error")).toContainText(
      /at least 2,?750/i,
    );
    await low.close();

    const exclusivity = await browser.newPage();
    await signIn(exclusivity, "slice62-ui-trade@example.com");
    await exclusivity.goto("/panels/tonneau");
    await exclusivity
      .getByTestId("intent-brand")
      .fill("Slice Sixty Two UI Trade");
    await exclusivity.getByTestId("intent-trade").fill("circuit snacks");
    await exclusivity.getByTestId("intent-submit").click();
    await expect(exclusivity.getByTestId("intent-error")).toContainText(
      /already held|one brand per trade/i,
    );
    await exclusivity.close();

    const ok = await browser.newPage();
    await signIn(ok, "slice62-ui-ok@example.com");
    await ok.goto("/panels/hood");
    await ok.getByTestId("intent-brand").fill("Slice Sixty Two UI Ok");
    await ok.getByTestId("intent-trade").fill("Circuit Vinyl");
    await ok.getByTestId("intent-standing").fill("2750");
    await ok.getByTestId("intent-submit").click();
    await expect(ok.getByTestId("intent-success")).toContainText("not charged");
    await expect(ok.getByTestId("intent-list")).toContainText(
      "Slice Sixty Two UI Ok",
    );
    await expect(ok.getByTestId("panel-standing")).toContainText("2,750");
    await expect(ok.getByTestId("seat-exclusivity")).toBeVisible();
    const okHtml = await ok.content();
    expect(okHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(okHtml.toLowerCase()).not.toContain("gmail.com");
    expect(okHtml).not.toContain("CLOSE_AT");
    expect(okHtml).toContain("$120,000");
    expect(okHtml).toContain(formatUsd(FLOOR_USD));
    await ok.close();
  });
});
