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
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import {
  buildShopSeatPdf,
  shopPdfSeatFromApproved,
  shopPdfTitle,
} from "../src/lib/shop-pdf";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.24 — shop PDF title is `Seat 04 — Driver doors`, not only the slug.
 * FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

const PANEL_ID = "driver-door" as const;
const TITLE = "Seat 04 — Driver doors";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 16.24: shop PDF title is numbered seat", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
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

  test("title is Seat 04 — Driver doors, not the slug", async () => {
    const placed = await placeIntentBid({
      panelId: PANEL_ID,
      userId: "ops1624-secret-user",
      brandLabel: "Pdf Title Brand",
      tradeLabel: "pdf title trade",
      standingUsd: 4500,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    await setIntentStatus(placed.bid.id, "approved");

    const seatResult = shopPdfSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: 0,
    });
    expect(seatResult.ok).toBe(true);
    if (!seatResult.ok) return;

    expect(shopPdfTitle(seatResult.seat)).toBe(TITLE);
    expect(shopPdfTitle(seatResult.seat)).not.toBe(PANEL_ID);
    expect(shopPdfTitle(seatResult.seat)).not.toBe(seatResult.seat.panelId);

    const text = Buffer.from(buildShopSeatPdf(seatResult.seat)).toString("utf8");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain(`/Title (${TITLE})`);
    expect(text).toContain(TITLE);
    expect(text).toContain(PANEL_ID);
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(text).not.toContain("ops1624-secret-user");
  });

  test("downloaded shop PDF carries the numbered title", async ({ page }) => {
    await signIn(page, "bidder1624@example.com");
    await page.goto(`/panels/${PANEL_ID}`);
    await page.getByTestId("intent-brand").fill("Pdf Title UI");
    await page.getByTestId("intent-trade").fill("pdf title ui");
    await page.getByTestId("intent-standing").fill("4500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText("Pdf Title UI");
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "shop@example.com");
    await page.goto("/partner/shop");
    const pdfLink = page.getByTestId(/^wrap-shop-pdf-/).first();
    await expect(pdfLink).toBeVisible();
    const href = await pdfLink.getAttribute("href");
    expect(href).toBeTruthy();

    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/application\/pdf/);
    const text = (await res.body()).toString("utf8");
    expect(text).toContain(`/Title (${TITLE})`);
    expect(text).toContain(TITLE);
    expect(text).not.toContain(`/Title (${PANEL_ID})`);
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);
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
