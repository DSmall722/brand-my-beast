import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { isShopPartnerEmail } from "../src/lib/auth/shop-partner";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  buildShopSeatPdf,
  shopPdfFinishForPanel,
  shopPdfPath,
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
 * Slice 8.6 — shop PDF for an approved seat. No Imagine API.
 */
test.describe("slice 8.6: shop PDF builder", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe and no Imagine SDK", () => {
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
    expect(names.some((name) => name.toLowerCase().includes("imagine"))).toBe(
      false,
    );
  });

  test("finish labels lock etch under buyout", () => {
    const hood = PANELS.find((p) => p.id === "hood");
    expect(hood).toBeTruthy();
    const locked = shopPdfFinishForPanel(hood!, 0);
    expect(locked.finish).toBe("wrap_etch_locked");
    expect(locked.finishLabel).toContain("$120,000");
    const open = shopPdfFinishForPanel(hood!, GOAL_USD);
    expect(open.finish).toBe("wrap_or_etch");
  });

  test("buildShopSeatPdf emits PDF with panel brand finish art fences", async () => {
    await resetIntentStoreForTests();
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "test:shop86@example.com",
      brandLabel: "ShopPdfCo",
      tradeLabel: "shop vinyl",
      standingUsd: 2_500,
      artworkUrl: "https://cdn.example.com/shop86.svg",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const listedOnly = shopPdfSeatFromApproved({
      bid: { ...placed.bid },
      pledgedUsd: 0,
    });
    expect(listedOnly.ok).toBe(false);

    await setIntentStatus(placed.bid.id, "approved");
    const seatResult = shopPdfSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: 0,
    });
    expect(seatResult.ok).toBe(true);
    if (!seatResult.ok) return;

    const bytes = buildShopSeatPdf(seatResult.seat);
    const text = Buffer.from(bytes).toString("utf8");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("ShopPdfCo");
    expect(text).toContain("hood");
    expect(text).toContain("https://cdn.example.com/shop86.svg");
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toContain("No Imagine API call");
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(text).not.toContain("CLOSE_AT=");
  });

  test("shop partner can download approved seat PDF", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("PdfSeatCo");
    await page.getByTestId("intent-trade").fill("pdf vinyl");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText("PdfSeatCo");
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    expect(
      isShopPartnerEmail("shop@example.com", { AUTH_MODE: "test" }),
    ).toBe(true);

    await signIn(page, "shop@example.com");
    await page.goto("/partner/shop");
    await expect(page.getByTestId("partner-shop")).toBeVisible();
    await expect(page.getByTestId("wrap-shop-approved-list")).toContainText(
      "PdfSeatCo",
    );

    const pdfLink = page.getByTestId(/^wrap-shop-pdf-/).first();
    await expect(pdfLink).toBeVisible();
    const href = await pdfLink.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href!.startsWith("/api/partner/shop/pdf/")).toBe(true);

    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/application\/pdf/);
    const body = await res.body();
    const text = body.toString("utf8");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("PdfSeatCo");
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);

    const anon = await request.get(shopPdfPath("not-a-real-bid"));
    expect(anon.status()).toBe(401);
  });
});
