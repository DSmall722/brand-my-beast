import { expect, test } from "@playwright/test";
import { pledgedUsdForPanel } from "../src/lib/intent";
import { PUBLIC_COPY } from "../src/lib/public-copy";

test.describe("Oct 4 QA sweep", () => {
  test.beforeEach(async ({ request }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
  });

  test("closed bid desk hides the form and the server rejects the post", async ({
    page,
    request,
  }) => {
    await page.goto("/panels/hood");
    await page.getByTestId("seat-primary-cta").click();
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("data-bid-window", "closed");
    await expect(page.getByTestId("bid-modal-closed")).toContainText(
      "Bidding is not open",
    );
    await expect(page.getByTestId("bid-modal-amount")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-brand")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-email")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-logo")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-website")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-submit")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-join")).toHaveText("Join the list");
    await expect(page.getByTestId("bid-modal-join")).toHaveAttribute(
      "href",
      "/#contactus",
    );

    const rejected = await request.post("/api/bid", {
      data: {
        panelId: "hood",
        standingUsd: 2500,
        brandLabel: "Should Not List",
      },
    });
    expect(rejected.status()).toBe(403);
    const body = (await rejected.json()) as { ok: boolean; code: string };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("bidding_closed");

    await page.goto("/leaderboard");
    await expect(page.getByTestId("leaderboard-empty")).toHaveText("No bids yet.");
    await expect(page.getByTestId("leaderboard-page")).not.toContainText(
      "Should Not List",
    );
  });

  test("empty ledger shows labeled sample history and $0 raised", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("raised-amount")).toHaveText("$0");
    const history = page.getByTestId("day-by-day");
    await expect(history).toHaveAttribute("data-source", "sample");
    await expect(history.getByTestId("day-by-day-lead")).toHaveText(
      PUBLIC_COPY.bidDesk.daySampleLead,
    );
    await expect(history.getByTestId("day-by-day-sample-standing")).toContainText(
      "2 Sep",
    );
    await expect(history.getByTestId("day-line-sample-hood")).toContainText(
      "Sample Mark",
    );
    await expect(history.getByTestId("day-line-sample-rear-bumper")).toContainText(
      "$500",
    );
    await expect(page.getByTestId("panel-hood")).not.toContainText("Sample Mark");
    await expect(page.getByTestId("panel-current-bid-hood")).toHaveText(
      "Current Bid $2,500",
    );
    await expect(page.getByTestId("auction-top")).toContainText(
      "No standing bids yet.",
    );

    await page.goto("/leaderboard");
    await expect(page.getByTestId("leaderboard-empty")).toHaveText("No bids yet.");
    await expect(page.getByTestId("leaderboard-page")).not.toContainText(
      "Sample Mark",
    );

    await page.goto("/panels/hood");
    await expect(page.getByTestId("day-by-day")).toHaveAttribute(
      "data-source",
      "sample",
    );
    await expect(page.getByTestId("day-by-day-lead")).toContainText(
      "No live bids yet",
    );
    await expect(page.getByTestId("panel-increment")).toHaveCount(0);
    await expect(page.getByTestId("panel-standing")).toHaveText("$2,500");
  });

  test("sitemap, robots, and canonical use the www host", async ({
    page,
    request,
  }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const xml = await sitemap.text();
    expect(xml).toContain("<loc>https://www.brandmybeast.com</loc>");
    expect(xml).toContain("<loc>https://www.brandmybeast.com/panels/hood</loc>");
    expect(xml).not.toContain("<loc>https://brandmybeast.com</loc>");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsBody = await robots.text();
    expect(robotsBody).toContain("Sitemap: https://www.brandmybeast.com/sitemap.xml");

    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://www.brandmybeast.com",
    );
  });

  test("an unpaid bid stays pending and does not raise the board", async ({
    page,
  }) => {
    expect(
      pledgedUsdForPanel([
        {
          status: "approved",
          standingUsd: 3000,
          floorSaveUsd: null,
        },
      ]),
    ).toBe(0);
    expect(
      pledgedUsdForPanel([
        {
          status: "approved",
          standingUsd: 3000,
          floorSaveUsd: null,
          depositPaidAt: "2026-10-04T12:00:00.000Z",
        },
      ]),
    ).toBe(3000);

    await page.goto("/signin");
    await page.getByTestId("signin-email").fill("qa-oct4@example.com");
    await page.getByTestId("signin-password").fill("test");
    await page.getByTestId("signin-submit").click();
    await expect(page.getByTestId("account-page")).toBeVisible();

    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Pending Hood");
    await page.getByTestId("intent-trade").fill("qa snacks");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText("not charged");

    await expect(page.getByTestId("panel-pending")).toHaveText("$2,500");
    await expect(page.getByTestId("panel-standing")).toHaveText("$2,500");
    await expect(page.getByTestId("day-by-day")).toHaveAttribute(
      "data-source",
      "live",
    );
    await expect(page.getByTestId("day-by-day")).not.toContainText("Sample Mark");
    await expect(page.getByTestId("day-by-day")).toContainText("Pending");

    await page.goto("/");
    await expect(page.getByTestId("raised-amount")).toHaveText("$0");
    await expect(page.getByTestId("panel-pending-hood")).toContainText("$2,500");
    await expect(page.getByTestId("panel-hood")).toHaveAttribute(
      "data-standing",
      "open",
    );
    await expect(page.getByTestId("auction-top")).toContainText(
      "No standing bids yet.",
    );

    await page.goto("/leaderboard");
    await expect(page.getByTestId("leaderboard-page")).toContainText(
      "Pending Hood",
    );
    await expect(page.getByTestId("leaderboard-page")).toContainText("Pending");
    await expect(page.getByTestId("leaderboard-empty")).toHaveCount(0);
  });
});
