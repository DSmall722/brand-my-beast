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
  getIntentBidById,
  placeIntentBid,
  rejectListedMatchingBanRule,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  addBanRule,
  resetOperatorBanListForTests,
} from "../src/lib/operator-ban-list";

/**
 * Slice 13.16 — ban-list change re-runs pending intents; approved seats stay.
 */
test.describe("slice 13.16: ban-list re-runs pending", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    resetOperatorBanListForTests();
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

  test("sweep rejects matching listed; matching approved stays", async () => {
    const pending = await placeIntentBid({
      panelId: "hood",
      userId: "ban1316-pending",
      brandLabel: "Glow Vape Pending",
      tradeLabel: "vape kits",
      standingUsd: 2500,
    });
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;

    const approvedPlace = await placeIntentBid({
      panelId: "tailgate",
      userId: "ban1316-approved",
      brandLabel: "Glow Vape Approved",
      tradeLabel: "vape juice",
      standingUsd: 2500,
    });
    expect(approvedPlace.ok).toBe(true);
    if (!approvedPlace.ok) return;

    const approved = await setIntentStatus(approvedPlace.bid.id, "approved", {
      note: "pre-ban approve",
    });
    expect(approved.ok).toBe(true);

    const clean = await placeIntentBid({
      panelId: "roof",
      userId: "ban1316-clean",
      brandLabel: "Clean Tools",
      tradeLabel: "hardware",
      standingUsd: 600,
    });
    expect(clean.ok).toBe(true);
    if (!clean.ok) return;

    const ban = await addBanRule({ pattern: "vape", note: "13.16" });
    expect(ban.ok).toBe(true);
    if (!ban.ok) return;

    const sweep = await rejectListedMatchingBanRule(ban.rule);
    expect(sweep.rejectedIds).toContain(pending.bid.id);
    expect(sweep.rejectedIds).not.toContain(clean.bid.id);
    expect(sweep.rejectedIds).not.toContain(approvedPlace.bid.id);
    expect(sweep.approvedLeftAlone).toBe(1);

    expect((await getIntentBidById(pending.bid.id))?.status).toBe("rejected");
    expect((await getIntentBidById(approvedPlace.bid.id))?.status).toBe(
      "approved",
    );
    expect((await getIntentBidById(clean.bid.id))?.status).toBe("listed");
    expect(CLOSE_AT).toBeNull();
  });
});
