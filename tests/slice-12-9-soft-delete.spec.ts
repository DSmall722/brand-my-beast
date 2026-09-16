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
  hardDeleteIntentBid,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
  withdrawPendingIntent,
} from "../src/lib/intent-store";

/**
 * Slice 12.9 — soft-delete withdrawn rows. Never hard-delete approved.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.9: soft-delete withdrawn; never hard-delete approved", () => {
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

  test("migration adds deleted_at for soft-delete", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0016_intent_deleted_at.sql"),
      "utf8",
    );
    expect(sql).toMatch(/deleted_at/);
    expect(sql).toMatch(/intent_bids/);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
    expect(sql.toLowerCase()).not.toMatch(/setup_intent/);
    expect(sql).not.toMatch(/\bCLOSE_AT\b/);
  });

  test("schema declares deletedAt on intentBids", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/db/schema.ts"),
      "utf8",
    );
    expect(src).toMatch(/deletedAt: timestamp\("deleted_at"/);
    expect(src).toMatch(/intent_bids_deleted_at_idx/);
    expect(src).not.toMatch(/from ["']stripe["']/);
  });

  test("withdraw soft-deletes; approved cannot be hard-deleted", async () => {
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_9_wd",
      brandLabel: "Soft Co",
      tradeLabel: "soft trade",
      standingUsd: 2500,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.bid.deletedAt).toBeNull();

    const withdrawn = await withdrawPendingIntent({
      bidId: listed.bid.id,
      userId: "user_12_9_wd",
      expectedUpdatedAt: listed.bid.updatedAt,
    });
    expect(withdrawn.ok).toBe(true);
    if (!withdrawn.ok) return;
    expect(withdrawn.bid.status).toBe("withdrawn");
    expect(withdrawn.bid.deletedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const kept = await getIntentBidById(listed.bid.id);
    expect(kept?.status).toBe("withdrawn");
    expect(kept?.deletedAt).toBeTruthy();

    const purged = await hardDeleteIntentBid(listed.bid.id);
    expect(purged.ok).toBe(true);
    expect(await getIntentBidById(listed.bid.id)).toBeNull();

    const approveMe = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_9_ap",
      brandLabel: "Keep Co",
      tradeLabel: "keep trade",
      standingUsd: 2500,
    });
    expect(approveMe.ok).toBe(true);
    if (!approveMe.ok) return;

    const approved = await setIntentStatus(approveMe.bid.id, "approved", {
      expectedUpdatedAt: approveMe.bid.updatedAt,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.bid.status).toBe("approved");
    expect(approved.bid.deletedAt).toBeNull();

    const blocked = await hardDeleteIntentBid(approveMe.bid.id);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) return;
    expect(blocked.error).toMatch(/never hard-delete an approved/i);
    expect(await getIntentBidById(approveMe.bid.id)).not.toBeNull();
  });
});
