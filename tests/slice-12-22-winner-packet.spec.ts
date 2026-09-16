import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
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
  WINNER_PACKET_WRAP_TERM,
  buildWinnerPacketMarkdown,
  winnerPacketPath,
  winnerPacketSeatFromApproved,
} from "../src/lib/winner-packet";

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
 * Slice 12.22 — winner packet markdown: panel, brand, wrap vs etch, 12-month term.
 * CLOSE_AT null. No Stripe. No lease.
 */
test.describe("slice 12.22: winner packet markdown", () => {
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

  test("buildWinnerPacketMarkdown includes panel brand wrap-vs-etch and 12-month term", async () => {
    await resetIntentStoreForTests();
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "test:packet22@example.com",
      brandLabel: "PacketCo",
      tradeLabel: "packet trade",
      standingUsd: 2_500,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const listedOnly = winnerPacketSeatFromApproved({
      bid: { ...placed.bid },
      pledgedUsd: 0,
    });
    expect(listedOnly.ok).toBe(false);

    await setIntentStatus(placed.bid.id, "approved");
    const seatResult = winnerPacketSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: 0,
    });
    expect(seatResult.ok).toBe(true);
    if (!seatResult.ok) return;

    const hood = PANELS.find((p) => p.id === "hood");
    expect(hood).toBeTruthy();
    expect(seatResult.seat.panelName).toBe(hood!.name);
    expect(seatResult.seat.brandLabel).toBe("PacketCo");
    expect(seatResult.seat.finish).toBe("wrap_etch_locked");
    expect(seatResult.seat.wrapTerm).toBe(WINNER_PACKET_WRAP_TERM);

    const md = buildWinnerPacketMarkdown(seatResult.seat);
    expect(md).toContain("# BrandMyBeast — winner packet");
    expect(md).toContain("Hood");
    expect(md).toContain("`hood`");
    expect(md).toContain("PacketCo");
    expect(md).toContain("## Wrap vs etch");
    expect(md).toContain(seatResult.seat.finishLabel);
    expect(md).toContain("## Term");
    expect(md).toContain("12 months from install day");
    expect(md).toContain("not from close");
    expect(md).toContain("$58,000");
    expect(md).toContain("$120,000");
    expect(md.toLowerCase()).not.toMatch(/\blease\b/);
    expect(md).not.toContain("CLOSE_AT=");

    const atBuyout = winnerPacketSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: GOAL_USD,
    });
    expect(atBuyout.ok).toBe(true);
    if (!atBuyout.ok) return;
    expect(atBuyout.seat.finish).toBe("wrap_or_etch");
    const buyoutMd = buildWinnerPacketMarkdown(atBuyout.seat);
    expect(buyoutMd).toContain("wrap_or_etch");
  });

  test("winner can download packet; other user and anon cannot", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("WinnerPacketCo");
    await page.getByTestId("intent-trade").fill("winner vinyl");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText(
      "WinnerPacketCo",
    );
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "bidder-a@example.com");
    await page.goto("/account/wins");
    await expect(page.getByTestId("winner-portal")).toBeVisible();
    await expect(page.getByTestId("winner-portal-seats-list")).toContainText(
      "WinnerPacketCo",
    );

    const packetLink = page.getByTestId(/^winner-packet-/).first();
    await expect(packetLink).toBeVisible();
    const href = await packetLink.getAttribute("href");
    expect(href).toBeTruthy();
    expect(href!.startsWith("/api/account/wins/packet/")).toBe(true);

    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/text\/markdown/);
    const body = await res.text();
    expect(body).toContain("WinnerPacketCo");
    expect(body).toContain("Hood");
    expect(body).toContain("## Wrap vs etch");
    expect(body).toContain("12 months from install day");
    expect(body).toContain("$58,000");
    expect(body).toContain("$120,000");
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);

    await signIn(page, "bidder-b@example.com");
    const other = await page.request.get(href!);
    expect(other.status()).toBe(403);

    const anon = await request.get(winnerPacketPath("not-a-real-bid"));
    expect(anon.status()).toBe(401);
  });
});
