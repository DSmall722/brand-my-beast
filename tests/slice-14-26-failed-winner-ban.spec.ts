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
import type { IntentBid } from "../src/lib/intent";
import {
  isFailedWinnerTradeBanned,
  nextCompliantFailedWinnerMark,
  resolveFailedWinnerOfferForViewer,
} from "../src/lib/failed-winner-offer";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.26 — Failed-winner offer cannot target a banned trade.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

function bid(
  partial: Partial<IntentBid> &
    Pick<IntentBid, "id" | "userId" | "standingUsd" | "status">,
): IntentBid {
  return {
    panelId: "hood",
    brandLabel: "Brand",
    tradeLabel: "tools",
    depositUsd: 500,
    createdAt: "2026-09-16T10:00:00.000Z",
    updatedAt: "2026-09-16T10:00:00.000Z",
    idempotencyKey: null,
    artworkUrl: null,
    proxyMaxUsd: null,
    floorSaveUsd: null,
    deletedAt: null,
    ...partial,
  };
}

test.describe("slice 14.26: failed-winner offer skips banned trades", () => {
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

  test("unit: static + operator bans block failed-winner targeting", () => {
    expect(isFailedWinnerTradeBanned("Acme", "scam widgets")).toBe(true);
    expect(isFailedWinnerTradeBanned("Acme", "hate merch")).toBe(true);
    expect(isFailedWinnerTradeBanned("Acme", "lawn care")).toBe(false);
    expect(
      isFailedWinnerTradeBanned("Acme", "lawn care", [{ pattern: "lawn" }]),
    ).toBe(true);

    const now = new Date("2026-09-16T15:00:00.000Z");
    const rejectAt = "2026-09-16T12:00:00.000Z";
    const bids = [
      bid({
        id: "banned-high",
        userId: "user-banned",
        standingUsd: 3000,
        status: "outbid",
        brandLabel: "BadCo",
        tradeLabel: "scam kits",
        updatedAt: "2026-09-16T11:00:00.000Z",
        createdAt: "2026-09-16T09:00:00.000Z",
      }),
      bid({
        id: "ok",
        userId: "user-ok",
        standingUsd: 2500,
        status: "outbid",
        brandLabel: "GoodCo",
        tradeLabel: "tools",
        updatedAt: "2026-09-16T11:30:00.000Z",
        createdAt: "2026-09-16T09:30:00.000Z",
      }),
      bid({
        id: "rej",
        userId: "user-r",
        standingUsd: 2000,
        status: "rejected",
        brandLabel: "Rejected",
        tradeLabel: "paint",
        updatedAt: rejectAt,
        createdAt: "2026-09-16T08:00:00.000Z",
      }),
    ];

    const next = nextCompliantFailedWinnerMark(bids, {
      panelMinimumUsd: 2500,
      now,
    });
    expect(next?.bid.userId).toBe("user-ok");
    expect(next?.bid.tradeLabel).toBe("tools");

    const occupied = [
      bid({
        id: "holder",
        userId: "holder",
        standingUsd: 3500,
        status: "approved",
        brandLabel: "Holder",
        tradeLabel: "tools",
      }),
      bid({
        id: "banned-out",
        userId: "user-banned",
        standingUsd: 3000,
        status: "outbid",
        brandLabel: "BadCo",
        tradeLabel: "phishing gear",
        updatedAt: "2026-09-16T14:00:00.000Z",
      }),
    ];
    const forBanned = resolveFailedWinnerOfferForViewer({
      bids: occupied,
      viewerId: "user-banned",
      panelMinimumUsd: 2500,
      now,
    });
    expect(forBanned.offer).toBeNull();
    expect(forBanned.expiredForViewer).toBe(true);

    const opBanned = [
      bid({
        id: "holder2",
        userId: "holder2",
        standingUsd: 3500,
        status: "listed",
        brandLabel: "Holder",
        tradeLabel: "tools",
      }),
      bid({
        id: "op-ban",
        userId: "user-op",
        standingUsd: 2800,
        status: "outbid",
        brandLabel: "VapeCo",
        tradeLabel: "nicotine pods",
        updatedAt: "2026-09-16T14:00:00.000Z",
      }),
    ];
    const forOp = resolveFailedWinnerOfferForViewer({
      bids: opBanned,
      viewerId: "user-op",
      panelMinimumUsd: 2500,
      now,
      operatorBanRules: [{ pattern: "nicotine" }],
    });
    expect(forOp.offer).toBeNull();
    expect(forOp.expiredForViewer).toBe(true);

    const src = readFileSync(
      join(process.cwd(), "src/lib/failed-winner-offer.ts"),
      "utf8",
    );
    expect(src).toContain("isFailedWinnerTradeBanned");
    expect(src).toContain("Slice 14.26");
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
