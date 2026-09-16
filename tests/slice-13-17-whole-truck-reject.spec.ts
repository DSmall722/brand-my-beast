import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import {
  WHOLE_TRUCK_PANEL_USD,
  getIntentBidById,
  listBidsForPanel,
  listWholeTruckSiblingBids,
  placeWholeTruckIntent,
  rejectWholeTruckIntent,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 13.17 — whole-truck reject rolls back all twelve rows in one transaction.
 */
test.describe("slice 13.17: whole-truck reject rolls back twelve", () => {
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
    expect(WHOLE_TRUCK_PANEL_USD * PANELS.length).toBe(GOAL_USD);
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

  test("reject one whole-truck row rejects all twelve", async () => {
    const whole = await placeWholeTruckIntent({
      userId: "wt1317-user",
      brandLabel: "Fleet Reject Co",
      tradeLabel: "fleet tools",
    });
    expect(whole.ok).toBe(true);
    if (!whole.ok) return;
    expect(whole.bids).toHaveLength(12);
    expect(whole.bids.every((bid) => bid.status === "listed")).toBe(true);

    const anchor = whole.bids[0];
    expect(anchor).toBeTruthy();
    if (!anchor) return;

    const siblings = await listWholeTruckSiblingBids(anchor.id);
    expect(siblings).not.toBeNull();
    expect(siblings?.length).toBe(12);

    const rejected = await rejectWholeTruckIntent({
      bidId: anchor.id,
      note: "Whole-truck art does not clear highway legibility.",
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.bids).toHaveLength(12);
    expect(rejected.bids.every((bid) => bid.status === "rejected")).toBe(true);

    for (const panel of PANELS) {
      const rows = await listBidsForPanel(panel.id);
      const match = rows.find((row) => row.userId === "wt1317-user");
      expect(match?.status).toBe("rejected");
      expect(match?.standingUsd).toBe(WHOLE_TRUCK_PANEL_USD);
    }

    const after = await listWholeTruckSiblingBids(anchor.id);
    expect(after).toBeNull();
  });

  test("setIntentStatus reject cascades across whole-truck set", async () => {
    const whole = await placeWholeTruckIntent({
      userId: "wt1317-cascade",
      brandLabel: "Cascade Fleet",
      tradeLabel: "cascade tools",
    });
    expect(whole.ok).toBe(true);
    if (!whole.ok) return;

    const mid = whole.bids[5];
    expect(mid).toBeTruthy();
    if (!mid) return;

    const result = await setIntentStatus(mid.id, "rejected", {
      note: "Operator veto on whole-truck set.",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bid.status).toBe("rejected");

    for (const bid of whole.bids) {
      const live = await getIntentBidById(bid.id);
      expect(live?.status).toBe("rejected");
    }
  });

  test("incomplete whole-truck set is refused; remaining listed stay listed", async () => {
    const whole = await placeWholeTruckIntent({
      userId: "wt1317-rollback",
      brandLabel: "Rollback Fleet",
      tradeLabel: "rollback tools",
    });
    expect(whole.ok).toBe(true);
    if (!whole.ok) return;

    const anchor = whole.bids[0];
    const victim = whole.bids[1];
    expect(anchor && victim).toBeTruthy();
    if (!anchor || !victim) return;

    // Break the set: one panel no longer listed → reject must refuse.
    const corrupted = await setIntentStatus(victim.id, "withdrawn");
    expect(corrupted.ok).toBe(true);

    const siblings = await listWholeTruckSiblingBids(anchor.id);
    expect(siblings).toBeNull();

    const rejected = await rejectWholeTruckIntent({
      bidId: anchor.id,
      note: "Should not partially reject.",
    });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.error).toMatch(/whole-truck|listed/i);

    const anchorLive = await getIntentBidById(anchor.id);
    expect(anchorLive?.status).toBe("listed");

    for (const bid of whole.bids) {
      if (bid.id === victim.id) continue;
      const live = await getIntentBidById(bid.id);
      expect(live?.status).toBe("listed");
    }
    const victimLive = await getIntentBidById(victim.id);
    expect(victimLive?.status).toBe("withdrawn");
  });

  test("reject note is required for whole-truck", async () => {
    const whole = await placeWholeTruckIntent({
      userId: "wt1317-note",
      brandLabel: "Note Fleet",
      tradeLabel: "note tools",
    });
    expect(whole.ok).toBe(true);
    if (!whole.ok) return;

    const anchor = whole.bids[0];
    if (!anchor) return;

    const rejected = await rejectWholeTruckIntent({
      bidId: anchor.id,
      note: "   ",
    });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.error).toMatch(/note/i);

    for (const bid of whole.bids) {
      const live = await getIntentBidById(bid.id);
      expect(live?.status).toBe("listed");
    }
  });

  test("homepage HTML has no lease and no personal handle", async ({
    page,
  }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("@BrandMyBeast");
    expect(html).not.toMatch(/@gmail\.com/i);
  });
});
