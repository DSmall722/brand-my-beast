import { expect, test } from "@playwright/test";
import { markBidPaid } from "./helpers/mark-paid";

const OPEN_NOW = "2026-10-06T16:00:00.000Z";
const BRAND = "Qa Hidden Mark";
const TRADE = "zzhidetrade";

test.describe("BMB-QA-457 paid-only public board", () => {
  test("unpaid /api/bid stays hidden and does not raise the minimum; paid shows and raises it", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: OPEN_NOW },
    });
    expect(opened.ok()).toBeTruthy();

    const early = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2500,
        brandLabel: BRAND,
        tradeLabel: TRADE,
        email: "qa457@example.com",
      },
    });
    expect(early.ok()).toBeTruthy();
    const placed = (await early.json()) as {
      bidId: string;
      depositDueUsd: number;
    };
    expect(placed.depositDueUsd).toBe(500);

    await page.goto("/");
    await expect(page.getByTestId("panel-hood")).not.toContainText(BRAND);
    await expect(page.getByTestId("panel-current-bid-hood")).toHaveText(
      "Opening floor $2,500",
    );
    await expect(page.getByTestId("auction-today")).not.toContainText(BRAND);
    await expect(page.getByTestId("auction-top")).not.toContainText(BRAND);
    await expect(page.getByTestId("day-by-day")).toHaveCount(0);
    await expect(page.getByTestId("panel-front-bumper")).toContainText(
      "Front Bumper",
    );

    await page.goto("/leaderboard");
    await expect(page.getByTestId("leaderboard-page")).not.toContainText(BRAND);

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-stats")).toHaveAttribute(
      "data-minimum-usd",
      "2500",
    );
    await expect(page.getByTestId("panel-stats")).toHaveAttribute(
      "data-standing-usd",
      "0",
    );
    await expect(page.getByTestId("panel-minimum")).toHaveText("$2,500");
    await expect(page.getByTestId("panel-standing")).toHaveCount(0);
    await expect(page.getByTestId("public-seat-log")).toHaveCount(0);
    await expect(page.getByTestId("day-by-day")).not.toContainText(BRAND);
    await expect(page.getByTestId("day-by-day")).not.toContainText("standing");

    await markBidPaid(request, {
      bidId: placed.bidId,
      amountTotalCents: placed.depositDueUsd * 100,
    });

    await page.goto("/");
    await expect(page.getByTestId("panel-hood")).toContainText(BRAND);
    await expect(page.getByTestId("panel-current-bid-hood")).toHaveText(
      "Current Bid $2,500",
    );
    await expect(page.getByTestId("auction-today")).toContainText(BRAND);
    await expect(page.getByTestId("day-by-day")).toContainText(BRAND);
    await expect(page.getByTestId("day-by-day")).toContainText("standing");

    await page.goto("/leaderboard");
    await expect(page.getByTestId("leaderboard-podium")).toContainText(BRAND);

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-minimum")).toHaveText("$2,750");
    await expect(page.getByTestId("panel-standing")).toHaveText("$2,500");
    const activity = page.getByTestId("public-seat-log");
    await expect(activity).toContainText(BRAND);
    await expect(activity).not.toContainText(TRADE);
    await expect(page.getByTestId("day-by-day")).toContainText("standing");
  });

  test("cancelled checkout says no deposit was taken", async ({ page }) => {
    await page.goto("/panels/hood?checkout=cancelled");
    const status = page.getByTestId("checkout-cancelled");
    await expect(status).toHaveAttribute("role", "status");
    await expect(status).toContainText(
      "Checkout cancelled. No deposit was taken and your bid was not placed. You can bid again below.",
    );
  });
});
