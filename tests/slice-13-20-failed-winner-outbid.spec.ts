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
import {
  buildFailedWinnerOffer,
} from "../src/lib/failed-winner-offer";
import { nextStandingUsd } from "../src/lib/intent";
import {
  getIntentBidById,
  listBidsForPanel,
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

/**
 * Slice 13.20 — failed-winner accepts → old winner is `outbid`, not deleted.
 * Soft-status only. CLOSE_AT null. No Stripe.
 */
test.describe("slice 13.20: failed-winner accept leaves old winner outbid", () => {
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

  test("accepting failed-winner offer outbids prior holder without delete", async () => {
    const failed = await placeIntentBid({
      panelId: "hood",
      userId: "user_1320_failed",
      brandLabel: "FW Accept Co",
      tradeLabel: "fw accept snacks",
      standingUsd: 2500,
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    const failedFirstId = failed.bid.id;

    const winner = await placeIntentBid({
      panelId: "hood",
      userId: "user_1320_winner",
      brandLabel: "Standing Winner Co",
      tradeLabel: "winner tools",
      standingUsd: 2750,
    });
    expect(winner.ok).toBe(true);
    if (!winner.ok) return;
    const winnerId = winner.bid.id;

    const afterOutbid = await getIntentBidById(failedFirstId);
    expect(afterOutbid?.status).toBe("outbid");
    expect(afterOutbid?.deletedAt).toBeNull();

    const offer = buildFailedWinnerOffer({
      lastMarkUsd: 2500,
      panelMinimumUsd: nextStandingUsd(2750),
      offeredAt: afterOutbid!.updatedAt,
      now: new Date(afterOutbid!.updatedAt),
    });
    expect(offer.offerUsd).toBe(3025);
    expect(offer.offerUsd).toBe(nextStandingUsd(2750));

    const accept = await placeIntentBid({
      panelId: "hood",
      userId: "user_1320_failed",
      brandLabel: "FW Accept Co",
      tradeLabel: "fw accept snacks",
      standingUsd: offer.offerUsd,
    });
    expect(accept.ok).toBe(true);
    if (!accept.ok) return;

    // Old winner is soft-status outbid — still on the ledger.
    const oldWinner = await getIntentBidById(winnerId);
    expect(oldWinner).toBeTruthy();
    expect(oldWinner!.status).toBe("outbid");
    expect(oldWinner!.deletedAt).toBeNull();
    expect(oldWinner!.standingUsd).toBe(2750);
    expect(oldWinner!.brandLabel).toBe("Standing Winner Co");

    const hood = await listBidsForPanel("hood");
    expect(hood.some((bid) => bid.id === winnerId)).toBe(true);
    expect(hood.filter((bid) => bid.id === winnerId)).toHaveLength(1);

    // Failed-winner's first mark also remains outbid (not deleted).
    const firstMark = await getIntentBidById(failedFirstId);
    expect(firstMark?.status).toBe("outbid");
    expect(firstMark?.deletedAt).toBeNull();

    // New standing is the accepted offer — listed, not a hard replace.
    expect(accept.bid.status).toBe("listed");
    expect(accept.bid.standingUsd).toBe(3025);
    expect(accept.bid.id).not.toBe(failedFirstId);
    expect(accept.bid.deletedAt).toBeNull();

    const approvedOrListed = hood.filter(
      (bid) => bid.status === "listed" || bid.status === "approved",
    );
    expect(approvedOrListed).toHaveLength(1);
    expect(approvedOrListed[0]!.id).toBe(accept.bid.id);
  });

  test("intent-store outbid path never hard-deletes listed challengers", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toMatch(/existing\.status = "outbid"/);
    expect(src).toMatch(/Never hard-delete an approved bid/);
    expect(src).not.toMatch(/from ["']stripe["']/);
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
