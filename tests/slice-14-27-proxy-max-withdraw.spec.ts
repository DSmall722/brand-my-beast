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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { nextStandingUsd } from "../src/lib/intent";
import {
  getIntentBidById,
  listBidsForPanel,
  placeIntentBid,
  resetIntentStoreForTests,
  withdrawPendingIntent,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.27 — Proxy max ignored after the bidder withdraws.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

test.describe("slice 14.27: proxy max ignored after withdraw", () => {
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
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("withdraw clears proxyMaxUsd; later challenges do not revive it", async () => {
    const holder = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_withdraw_a",
      brandLabel: "Proxy Leave",
      tradeLabel: "leave snacks",
      standingUsd: 2500,
      proxyMaxUsd: 5000,
    });
    expect(holder.ok).toBeTruthy();
    if (!holder.ok) return;
    expect(holder.bid.proxyMaxUsd).toBe(5000);

    const withdrawn = await withdrawPendingIntent({
      bidId: holder.bid.id,
      userId: "proxy_withdraw_a",
      expectedUpdatedAt: holder.bid.updatedAt,
    });
    expect(withdrawn.ok).toBeTruthy();
    if (!withdrawn.ok) return;
    expect(withdrawn.bid.status).toBe("withdrawn");
    expect(withdrawn.bid.proxyMaxUsd).toBeNull();
    expect(withdrawn.bid.deletedAt).toBeTruthy();

    const live = await getIntentBidById(holder.bid.id);
    expect(live?.proxyMaxUsd).toBeNull();
    expect(live?.status).toBe("withdrawn");

    const seat = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_withdraw_b",
      brandLabel: "Seat Taker",
      tradeLabel: "seat tools",
      standingUsd: 2500,
    });
    expect(seat.ok).toBeTruthy();
    if (!seat.ok) return;
    expect(seat.bid.status).toBe("listed");

    const challengeStanding = nextStandingUsd(seat.bid.standingUsd);
    const challenger = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_withdraw_c",
      brandLabel: "Challenger",
      tradeLabel: "fight tools",
      standingUsd: challengeStanding,
    });
    expect(challenger.ok).toBeTruthy();
    if (!challenger.ok) return;

    const listed = await listBidsForPanel("hood");
    const standingListed = listed.filter((row) => row.status === "listed");
    expect(standingListed).toHaveLength(1);
    // Withdrawn proxy must not re-enter; challenger keeps the seat.
    expect(standingListed[0]?.userId).toBe("proxy_withdraw_c");
    expect(standingListed[0]?.standingUsd).toBe(challengeStanding);

    const ghost = listed.filter((row) => row.userId === "proxy_withdraw_a");
    expect(ghost.every((row) => row.status === "withdrawn")).toBe(true);
    expect(ghost.every((row) => row.proxyMaxUsd == null)).toBe(true);

    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toContain("Slice 14.27");
    expect(src).toMatch(/proxyMaxUsd:\s*null/);
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
