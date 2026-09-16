import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
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
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  PARTNER_SHOP_SEAT_KEYS,
  partnerSeatLeaksUserId,
  partnerViewContainsBidderEmail,
  toPartnerShopSeat,
  toPartnerShopSeats,
} from "../src/lib/partner-shop-seat";
import {
  buildShopSeatPdf,
  shopPdfSeatFromApproved,
} from "../src/lib/shop-pdf";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function resetServerIntents(request: APIRequestContext) {
  const res = await request.post("/api/test/reset-intents");
  expect(res.ok()).toBeTruthy();
}

/**
 * Slice 13.24 — partner cannot see bidder email; only brand + trade + art.
 */
test.describe("slice 13.24: partner no bidder email", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    await resetServerIntents(request);
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const cfg = JSON.parse(raw) as {
      git?: { deploymentEnabled?: boolean | Record<string, boolean> };
    };
    expect(cfg.git?.deploymentEnabled).toBe(false);
  });

  test("toPartnerShopSeat strips userId; helper detects email leaks", async () => {
    const bidderEmail = "secret-bidder-1324@example.com";
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: `test:${bidderEmail}`,
      brandLabel: "NoEmail Co",
      tradeLabel: "no email vinyl",
      standingUsd: 2500,
      artworkUrl: "https://cdn.example.com/no-email.svg",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    await setIntentStatus(placed.bid.id, "approved");

    const seat = toPartnerShopSeat({ ...placed.bid, status: "approved" });
    expect(Object.keys(seat).sort()).toEqual(
      [...PARTNER_SHOP_SEAT_KEYS].sort(),
    );
    expect(partnerSeatLeaksUserId(seat)).toBe(false);
    expect(partnerSeatLeaksUserId(placed.bid)).toBe(true);
    expect(JSON.stringify(seat)).not.toContain("userId");
    expect(JSON.stringify(seat)).not.toContain(bidderEmail);
    expect(seat.brandLabel).toBe("NoEmail Co");
    expect(seat.tradeLabel).toBe("no email vinyl");
    expect(seat.artworkUrl).toContain("no-email.svg");

    expect(
      partnerViewContainsBidderEmail(JSON.stringify(seat), bidderEmail),
    ).toBe(false);
    expect(
      partnerViewContainsBidderEmail(
        `leaked test:${bidderEmail}`,
        bidderEmail,
      ),
    ).toBe(true);

    const pdfSeat = shopPdfSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: 2500,
    });
    expect(pdfSeat.ok).toBe(true);
    if (!pdfSeat.ok) return;
    const pdfText = Buffer.from(buildShopSeatPdf(pdfSeat.seat)).toString(
      "utf8",
    );
    expect(partnerViewContainsBidderEmail(pdfText, bidderEmail)).toBe(false);
    expect(pdfText).toContain("NoEmail Co");
    expect(pdfText).toContain("no email vinyl");
  });

  test("partner shop HTML shows brand trade art without bidder email", async ({
    page,
  }) => {
    const bidderEmail = "bidder-a@example.com";

    await signIn(page, bidderEmail);
    await page.goto("/panels/tailgate");
    await page.getByTestId("intent-brand").fill("HideMailCo");
    await page.getByTestId("intent-trade").fill("hide mail vinyl");
    await page.getByTestId("intent-standing").fill("2500");
    await page
      .getByTestId("intent-artwork-url")
      .fill("https://cdn.example.com/hide-mail.svg");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 15_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText(
      "HideMailCo",
    );
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "shop@example.com");
    await page.goto("/partner/shop");
    await expect(page.getByTestId("partner-shop")).toBeVisible();
    await expect(page.getByTestId("wrap-shop-approved-list")).toContainText(
      "HideMailCo",
    );
    await expect(page.getByTestId("wrap-shop-approved-list")).toContainText(
      "hide mail vinyl",
    );
    await expect(page.getByTestId(/^intent-artwork-thumb-/).first()).toHaveAttribute(
      "src",
      "https://cdn.example.com/hide-mail.svg",
    );
    await expect(page.getByTestId("wrap-rule-no-email")).toContainText(
      "No bidder email",
    );
    await expect(page.getByTestId("partner-shop-lead")).toContainText(
      "no bidder email",
    );

    const html = await page.content();
    expect(partnerViewContainsBidderEmail(html, bidderEmail)).toBe(false);
    expect(html.toLowerCase()).not.toContain(`test:${bidderEmail}`);
    // Partner's own session email may appear in chrome; bidder must not.
    expect(html).not.toContain("bidder-a@example.com");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");

    // Projection for the approved list still has no userId.
    const seats = toPartnerShopSeats([]);
    expect(partnerSeatLeaksUserId(seats)).toBe(false);
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
