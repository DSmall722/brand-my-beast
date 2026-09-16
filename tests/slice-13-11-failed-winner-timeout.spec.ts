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
import type { IntentBid } from "../src/lib/intent";
import {
  FAILED_WINNER_OFFER_TTL_MS,
  assertFailedWinnerExclusiveLister,
  isFailedWinnerOfferExpired,
  nextCompliantFailedWinnerMark,
  resolveFailedWinnerOfferForViewer,
} from "../src/lib/failed-winner-offer";
import { placeIntentBid, setIntentStatus } from "../src/lib/intent-store";

function bid(partial: Partial<IntentBid> & Pick<IntentBid, "id" | "userId" | "standingUsd" | "status">): IntentBid {
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

/**
 * Slice 13.11 — failed-winner offer TTL; next compliant; no silent reopen.
 */
test.describe("slice 13.11: failed-winner timeout", () => {
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

  test("unit: offer expires after 24h; next compliant gets the window", () => {
    expect(FAILED_WINNER_OFFER_TTL_MS).toBe(24 * 60 * 60 * 1000);
    const offeredAt = "2026-09-16T12:00:00.000Z";
    expect(
      isFailedWinnerOfferExpired(offeredAt, new Date("2026-09-16T12:00:00.000Z")),
    ).toBe(false);
    expect(
      isFailedWinnerOfferExpired(offeredAt, new Date("2026-09-17T12:00:00.000Z")),
    ).toBe(true);

    const rejectAt = "2026-09-16T14:00:00.000Z";
    const bids: IntentBid[] = [
      bid({
        id: "a",
        userId: "user-a",
        standingUsd: 2500,
        status: "outbid",
        tradeLabel: "snacks",
        brandLabel: "Alpha",
        updatedAt: "2026-09-16T11:00:00.000Z",
        createdAt: "2026-09-16T09:00:00.000Z",
      }),
      bid({
        id: "b",
        userId: "user-b",
        standingUsd: 2200,
        status: "outbid",
        tradeLabel: "tools",
        brandLabel: "Beta",
        updatedAt: "2026-09-16T11:30:00.000Z",
        createdAt: "2026-09-16T09:30:00.000Z",
      }),
      bid({
        id: "r",
        userId: "user-r",
        standingUsd: 2750,
        status: "rejected",
        tradeLabel: "banned-ish",
        brandLabel: "Rejected",
        updatedAt: rejectAt,
        createdAt: "2026-09-16T10:00:00.000Z",
      }),
    ];

    const liveNow = new Date("2026-09-16T15:00:00.000Z");
    const first = nextCompliantFailedWinnerMark(bids, {
      panelMinimumUsd: 2500,
      now: liveNow,
    });
    expect(first?.bid.userId).toBe("user-a");
    expect(first?.offer.expired).toBe(false);
    expect(first?.offeredAt).toBe(rejectAt);

    const afterAExpires = new Date("2026-09-17T14:00:00.000Z");
    const second = nextCompliantFailedWinnerMark(bids, {
      panelMinimumUsd: 2500,
      now: afterAExpires,
    });
    expect(second?.bid.userId).toBe("user-b");
    expect(second?.offer.expired).toBe(false);

    const bothExpired = new Date("2026-09-18T14:00:00.000Z");
    expect(
      nextCompliantFailedWinnerMark(bids, {
        panelMinimumUsd: 2500,
        now: bothExpired,
      }),
    ).toBeNull();

    const exclusiveBlock = assertFailedWinnerExclusiveLister({
      bids,
      userId: "user-stranger",
      panelMinimumUsd: 2500,
      now: liveNow,
    });
    expect(exclusiveBlock.ok).toBe(false);
    if (!exclusiveBlock.ok) {
      expect(exclusiveBlock.error).toMatch(/No silent reopen/);
    }

    const exclusiveOk = assertFailedWinnerExclusiveLister({
      bids,
      userId: "user-a",
      panelMinimumUsd: 2500,
      now: liveNow,
    });
    expect(exclusiveOk.ok).toBe(true);

    const forA = resolveFailedWinnerOfferForViewer({
      bids,
      viewerId: "user-a",
      panelMinimumUsd: 2500,
      now: liveNow,
    });
    expect(forA.offer?.offerUsd).toBeGreaterThan(0);
    expect(forA.expiredForViewer).toBe(false);

    const forBWhileALive = resolveFailedWinnerOfferForViewer({
      bids,
      viewerId: "user-b",
      panelMinimumUsd: 2500,
      now: liveNow,
    });
    expect(forBWhileALive.offer).toBeNull();
    expect(forBWhileALive.expiredForViewer).toBe(true);
  });

  test("RULES.md documents 24h timeout", () => {
    const rules = readFileSync(join(process.cwd(), "RULES.md"), "utf8");
    expect(rules).toMatch(/13\.11/);
    expect(rules).toMatch(/24 hours/);
    expect(rules).toMatch(/No silent reopen|no silent reopen/);
    expect(rules).toContain("$58,000");
    expect(rules).toContain("$120,000");
  });

  test("vacant seat blocks stranger while exclusive offer is live", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "fw111-a",
      brandLabel: "FW111 Alpha",
      tradeLabel: "fw111 snacks",
      standingUsd: 2500,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "fw111-b",
      brandLabel: "FW111 Beta",
      tradeLabel: "fw111 tools",
      standingUsd: 2750,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const approved = await setIntentStatus(second.bid.id, "approved", {
      note: "ok",
    });
    expect(approved.ok).toBe(true);

    const rejected = await setIntentStatus(second.bid.id, "rejected", {
      note: "art fail",
    });
    expect(rejected.ok).toBe(true);

    const blocked = await placeIntentBid({
      panelId: "hood",
      userId: "fw111-stranger",
      brandLabel: "FW111 Stranger",
      tradeLabel: "fw111 paint",
      standingUsd: 2500,
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.error).toMatch(/No silent reopen/);
    }

    const accepted = await placeIntentBid({
      panelId: "hood",
      userId: "fw111-a",
      brandLabel: "FW111 Alpha",
      tradeLabel: "fw111 snacks",
      standingUsd: 3025,
    });
    expect(accepted.ok).toBe(true);
  });
});
