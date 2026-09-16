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
  INTENT_STALE_WRITE,
  assertIntentOnly,
  isStaleWriteError,
} from "../src/lib/intent";
import {
  editPendingIntent,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 12.2 — optimistic lock on intent_bids.updatedAt.
 * Second writer with a stale token gets typed `stale_write`. No Stripe.
 */
test.describe("slice 12.2: optimistic lock on updatedAt", () => {
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

  test("migration adds updated_at without capture columns", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0012_intent_updated_at.sql"),
      "utf8",
    );
    expect(sql).toMatch(/updated_at/);
    expect(sql.toLowerCase()).not.toMatch(/stripe/);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
    expect(sql.toLowerCase()).not.toMatch(/setup_intent/);
  });

  test("INTENT_STALE_WRITE is the typed optimistic-lock code", () => {
    expect(INTENT_STALE_WRITE).toBe("stale_write");
    expect(
      isStaleWriteError({
        ok: false,
        code: INTENT_STALE_WRITE,
        error: "x",
      }),
    ).toBe(true);
    expect(isStaleWriteError({ ok: false, error: "x" })).toBe(false);
  });

  test("second edit with stale updatedAt returns stale_write", async () => {
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_2_lock",
      brandLabel: "Lock Co",
      tradeLabel: "lock tools",
      standingUsd: 2500,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    assertIntentOnly(listed.bid);
    expect(listed.bid.updatedAt).toBeTruthy();
    const token = listed.bid.updatedAt;

    const first = await editPendingIntent({
      bidId: listed.bid.id,
      userId: "user_12_2_lock",
      brandLabel: "Lock Co One",
      tradeLabel: "lock tools",
      expectedUpdatedAt: token,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.bid.brandLabel).toBe("Lock Co One");
    expect(first.bid.updatedAt).not.toBe(token);

    const second = await editPendingIntent({
      bidId: listed.bid.id,
      userId: "user_12_2_lock",
      brandLabel: "Lock Co Two",
      tradeLabel: "lock tools",
      expectedUpdatedAt: token,
    });
    expect(second.ok).toBe(false);
    if (second.ok) return;
    expect(second.code).toBe(INTENT_STALE_WRITE);
    expect(isStaleWriteError(second)).toBe(true);
    expect(second.error).toMatch(/changed/i);
  });

  test("approve with stale updatedAt returns stale_write", async () => {
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_2_approve",
      brandLabel: "Approve Lock",
      tradeLabel: "approve lock trade",
      standingUsd: 2500,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    const token = listed.bid.updatedAt;

    const bump = await editPendingIntent({
      bidId: listed.bid.id,
      userId: "user_12_2_approve",
      brandLabel: "Approve Lock Bumped",
      tradeLabel: "approve lock trade",
      expectedUpdatedAt: token,
    });
    expect(bump.ok).toBe(true);
    if (!bump.ok) return;
    expect(bump.bid.updatedAt).not.toBe(token);

    const staleApprove = await setIntentStatus(listed.bid.id, "approved", {
      expectedUpdatedAt: token,
    });
    expect(staleApprove.ok).toBe(false);
    if (staleApprove.ok) return;
    expect(staleApprove.code).toBe(INTENT_STALE_WRITE);
    expect(isStaleWriteError(staleApprove)).toBe(true);
  });
});
