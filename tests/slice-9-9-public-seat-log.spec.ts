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
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import {
  buildPublicSeatLog,
  formatSeatLogTime,
} from "../src/lib/seat-log";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 9.9 — public seat log: amount + time. No bidder email.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 9.9: public seat log", () => {
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

  test("unit: seat log is amount + time; never email fields", async () => {
    expect(formatSeatLogTime("2026-09-16T12:34:56.789Z")).toBe(
      "2026-09-16T12:34:56Z",
    );

    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "seatlog-secret-user",
      brandLabel: "Seat Log Co",
      tradeLabel: "log tools",
      standingUsd: 3000,
    });
    expect(placed.ok).toBeTruthy();
    if (!placed.ok) return;

    const log = buildPublicSeatLog([placed.bid]);
    expect(log).toHaveLength(1);
    expect(log[0]?.amountLabel).toBe("$3,000");
    expect(log[0]?.amountUsd).toBe(3000);
    expect(log[0]?.timeLabel).toBe(formatSeatLogTime(placed.bid.createdAt));
    expect(log[0]?.brandLabel).toBe("Seat Log Co");
    const serialized = JSON.stringify(log);
    expect(serialized).not.toContain("seatlog-secret-user");
    expect(serialized).not.toContain("@");
    expect(serialized.toLowerCase()).not.toContain("email");
    expect(serialized).not.toContain("userId");
  });

  test("panel seat log shows amount + time without bidder email", async ({
    browser,
  }) => {
    const bidderEmail = "seatlog-bidder@example.com";
    const bidder = await browser.newPage();
    await signIn(bidder, bidderEmail);
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Public Log Brand");
    await bidder.getByTestId("intent-trade").fill("public log trade");
    await bidder.getByTestId("intent-standing").fill("3000");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await expect(bidder.getByTestId("public-seat-log")).toBeVisible();
    await expect(bidder.getByTestId("public-seat-log-list")).toContainText(
      "$3,000",
    );
    const row = bidder.locator('[data-testid^="seat-log-row-"]').first();
    await expect(row).toBeVisible();
    const bidId = (await row.getAttribute("data-testid"))!.replace(
      "seat-log-row-",
      "",
    );
    await expect(bidder.getByTestId(`seat-log-amount-${bidId}`)).toHaveText(
      "$3,000",
    );
    const timeText = await bidder
      .getByTestId(`seat-log-time-${bidId}`)
      .textContent();
    expect(timeText).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    await expect(bidder.getByTestId(`intent-time-${bidId}`)).toHaveText(
      timeText!,
    );
    await bidder.close();

    const visitor = await browser.newPage();
    await visitor.goto("/panels/hood");
    await expect(visitor.getByTestId("public-seat-log")).toBeVisible();
    await expect(visitor.getByTestId("public-seat-log-lead")).toContainText(
      "No bidder email",
    );
    await expect(visitor.getByTestId(`seat-log-amount-${bidId}`)).toHaveText(
      "$3,000",
    );
    await expect(visitor.getByTestId(`seat-log-time-${bidId}`)).toHaveText(
      timeText!,
    );
    const html = await visitor.content();
    expect(html).not.toContain(bidderEmail);
    expect(html).not.toContain("seatlog-bidder");
    expect(html.toLowerCase()).not.toContain("gmail.com");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    await visitor.close();
  });
});
