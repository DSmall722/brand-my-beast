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
  buildFailedWinnerOffer,
  failedWinnerOfferCopy,
  failedWinnerOfferUsd,
} from "../src/lib/failed-winner-offer";
import { nextStandingUsd } from "../src/lib/intent";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 9.6 — failed-winner offer at last mark + one increment.
 * No silent reopen. CLOSE_AT null. No Stripe.
 */
test.describe("slice 9.6: failed-winner offer", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
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

  test("unit: offer is last mark + max($250, 10%), never silent", () => {
    expect(failedWinnerOfferUsd(2500)).toBe(2750);
    expect(failedWinnerOfferUsd(3000)).toBe(3300);
    expect(failedWinnerOfferUsd(2500)).toBe(nextStandingUsd(2500));

    const offer = buildFailedWinnerOffer({
      lastMarkUsd: 2500,
      panelMinimumUsd: 2750,
      offeredAt: "2026-09-16T12:00:00.000Z",
      now: new Date("2026-09-16T12:00:00.000Z"),
    });
    expect(offer.offerUsd).toBe(2750);
    expect(offer.fromLastIncrementOnly).toBe(true);
    expect(offer.expired).toBe(false);

    const raisedMin = buildFailedWinnerOffer({
      lastMarkUsd: 2500,
      panelMinimumUsd: 3025,
      offeredAt: "2026-09-16T12:00:00.000Z",
      now: new Date("2026-09-16T12:00:00.000Z"),
    });
    expect(raisedMin.offerUsd).toBe(3025);
    expect(raisedMin.fromLastIncrementOnly).toBe(false);

    const copy = failedWinnerOfferCopy(offer);
    expect(copy).toContain("No silent reopen");
    expect(copy).toContain("not charged");
    expect(copy).not.toContain("CLOSE_AT");
    expect(copy.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("outbid viewer sees explicit offer prefilled — must submit", async ({
    browser,
  }) => {
    const first = await browser.newPage();
    await signIn(first, "fw96-a@example.com");
    await first.goto("/panels/hood");
    await first.getByTestId("intent-brand").fill("FW Alpha");
    await first.getByTestId("intent-trade").fill("fw snacks");
    await first.getByTestId("intent-standing").fill("2500");
    await first.getByTestId("intent-submit").click();
    await expect(first.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await expect(first.getByTestId("failed-winner-offer")).toHaveCount(0);
    await first.close();

    const second = await browser.newPage();
    await signIn(second, "fw96-b@example.com");
    await second.goto("/panels/hood");
    await second.getByTestId("intent-brand").fill("FW Beta");
    await second.getByTestId("intent-trade").fill("fw tools");
    await second.getByTestId("intent-standing").fill("2750");
    await second.getByTestId("intent-submit").click();
    await expect(second.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await second.close();

    const outbid = await browser.newPage();
    await signIn(outbid, "fw96-a@example.com");
    await outbid.goto("/panels/hood");

    await expect(outbid.getByTestId("failed-winner-offer")).toBeVisible();
    await expect(outbid.getByTestId("failed-winner-offer")).toHaveAttribute(
      "data-last-mark",
      "2500",
    );
    await expect(outbid.getByTestId("failed-winner-offer")).toHaveAttribute(
      "data-offer",
      "3025",
    );
    await expect(outbid.getByTestId("failed-winner-offer-copy")).toContainText(
      "No silent reopen",
    );
    await expect(outbid.getByTestId("failed-winner-offer-amount")).toContainText(
      "$3,025",
    );
    await expect(outbid.getByTestId("intent-failed-winner-prefill")).toContainText(
      "no silent reopen",
    );
    await expect(outbid.getByTestId("intent-standing")).toHaveValue("3025");
    await expect(outbid.getByTestId("intent-brand")).toHaveValue("FW Alpha");
    await expect(outbid.getByTestId("intent-trade")).toHaveValue("fw snacks");

    // Still listed as outbid until they submit — no silent reopen.
    await expect(outbid.getByTestId("intent-list")).toContainText("Outbid");
    await expect(outbid.getByTestId("panel-standing")).toHaveText("$2,750");

    await outbid.getByTestId("intent-submit").click();
    await expect(outbid.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await expect(outbid.getByTestId("panel-standing")).toHaveText("$3,025");
    await expect(outbid.getByTestId("failed-winner-offer")).toHaveCount(0);

    const html = await outbid.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(CLOSE_AT).toBeNull();
    await outbid.close();
  });
});
