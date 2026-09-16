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
  SHOP_ART_STATUSES,
  isShopArtStatus,
} from "../src/lib/shop-art-status";
import {
  getShopArtStatus,
  resetShopArtStatusStoreForTests,
  setShopArtStatus,
} from "../src/lib/shop-art-status-store";

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
 * Slice 12.24 — partner marks art shop-ready / needs-fix.
 * CLOSE_AT null. No card capture. No Stripe token in partner HTML.
 */
test.describe("slice 12.24: partner shop art status marks", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
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

  test("store accepts shop-ready and needs-fix on approved seats only", async () => {
    await resetIntentStoreForTests();
    await resetShopArtStatusStoreForTests();
    expect([...SHOP_ART_STATUSES]).toEqual([
      "unset",
      "shop-ready",
      "needs-fix",
    ]);
    expect(isShopArtStatus("shop-ready")).toBe(true);
    expect(isShopArtStatus("needs-fix")).toBe(true);

    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "test:shop24@example.com",
      brandLabel: "ArtMarkCo",
      tradeLabel: "art mark trade",
      standingUsd: 2_500,
      artworkUrl: "https://cdn.example.com/artmark.svg",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const listedOnly = await setShopArtStatus({
      bidId: placed.bid.id,
      status: "shop-ready",
      actorEmail: "shop@example.com",
    });
    expect(listedOnly.ok).toBe(false);

    await setIntentStatus(placed.bid.id, "approved");
    const ready = await setShopArtStatus({
      bidId: placed.bid.id,
      status: "shop-ready",
      actorEmail: "shop@example.com",
    });
    expect(ready.ok).toBe(true);
    expect(await getShopArtStatus(placed.bid.id)).toBe("shop-ready");

    const fix = await setShopArtStatus({
      bidId: placed.bid.id,
      status: "needs-fix",
      actorEmail: "shop@example.com",
    });
    expect(fix.ok).toBe(true);
    expect(await getShopArtStatus(placed.bid.id)).toBe("needs-fix");
  });

  test("partner can mark approved art shop-ready then needs-fix", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/tailgate");
    await page.getByTestId("intent-brand").fill("ReadyFixCo");
    await page.getByTestId("intent-trade").fill("ready vinyl");
    await page.getByTestId("intent-standing").fill("2500");
    await page
      .getByTestId("intent-artwork-url")
      .fill("https://cdn.example.com/readyfix.svg");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 15_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText(
      "ReadyFixCo",
    );
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "shop@example.com");
    await page.goto("/partner/shop");
    await expect(page.getByTestId("partner-shop")).toBeVisible();
    await expect(page.getByTestId("wrap-shop-approved-list")).toContainText(
      "ReadyFixCo",
    );

    const statusRoot = page.locator('[data-testid^="shop-art-status-"]').first();
    await expect(statusRoot).toHaveAttribute("data-status", "unset");

    await page.locator('[data-testid^="shop-art-mark-ready-"]').first().click();
    await expect(statusRoot).toHaveAttribute("data-status", "shop-ready", {
      timeout: 10_000,
    });
    await expect(
      page.locator('[data-testid^="shop-art-status-label-"]').first(),
    ).toContainText("shop-ready");

    await page.locator('[data-testid^="shop-art-mark-fix-"]').first().click();
    await expect(statusRoot).toHaveAttribute("data-status", "needs-fix", {
      timeout: 10_000,
    });
    await expect(
      page.locator('[data-testid^="shop-art-status-label-"]').first(),
    ).toContainText("needs-fix");

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("Stripe");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
