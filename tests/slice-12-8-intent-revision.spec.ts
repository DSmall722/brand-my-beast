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
  intentRevisionUsesMemory,
  listIntentRevisionsForBid,
  resetIntentRevisionsForTests,
} from "../src/lib/intent-revision";
import {
  editPendingIntent,
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

/**
 * Slice 12.8 — intent revision table: brand/trade/amount/art + timestamps.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.8: intent revision table", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    resetIntentRevisionsForTests();
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

  test("Production never uses intent revision memory", () => {
    expect(intentRevisionUsesMemory({ VERCEL_ENV: "production" })).toBe(false);
    expect(
      intentRevisionUsesMemory({
        VERCEL_ENV: "production",
        INTENT_MODE: "memory",
      }),
    ).toBe(false);
    expect(intentRevisionUsesMemory({ INTENT_MODE: "memory" })).toBe(true);
  });

  test("migration creates intent_revisions with brand trade amount art timestamps", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0015_intent_revisions.sql"),
      "utf8",
    );
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "intent_revisions"/);
    expect(sql).toMatch(/"brand_label"/);
    expect(sql).toMatch(/"trade_label"/);
    expect(sql).toMatch(/"standing_usd"/);
    expect(sql).toMatch(/"artwork_url"/);
    expect(sql).toMatch(/"created_at"/);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
    expect(sql.toLowerCase()).not.toMatch(/setup_intent/);
    expect(sql).not.toMatch(/\bCLOSE_AT\b/);
  });

  test("schema declares intentRevisions table", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/db/schema.ts"),
      "utf8",
    );
    expect(src).toMatch(/export const intentRevisions = pgTable/);
    expect(src).toMatch(/intent_revisions/);
    expect(src).toMatch(/brandLabel: text\("brand_label"\)/);
    expect(src).toMatch(/tradeLabel: text\("trade_label"\)/);
    expect(src).toMatch(/standingUsd: integer\("standing_usd"\)/);
    expect(src).toMatch(/artworkUrl: text\("artwork_url"\)/);
    expect(src).not.toMatch(/from ["']stripe["']/);
  });

  test("place + edit append brand/trade/amount/art revisions with timestamps", async () => {
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_8_rev",
      brandLabel: "Rev Co",
      tradeLabel: "rev trade",
      standingUsd: 2500,
      artworkUrl: "https://example.com/a.png",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const afterPlace = await listIntentRevisionsForBid(placed.bid.id);
    expect(afterPlace).toHaveLength(1);
    expect(afterPlace[0]?.brandLabel).toBe("Rev Co");
    expect(afterPlace[0]?.tradeLabel).toBe("rev trade");
    expect(afterPlace[0]?.standingUsd).toBe(2500);
    expect(afterPlace[0]?.artworkUrl).toBe("https://example.com/a.png");
    expect(afterPlace[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const edited = await editPendingIntent({
      bidId: placed.bid.id,
      userId: "user_12_8_rev",
      brandLabel: "Rev Co Edited",
      tradeLabel: "rev trade two",
      artworkUrl: "https://example.com/b.png",
      expectedUpdatedAt: placed.bid.updatedAt,
    });
    expect(edited.ok).toBe(true);
    if (!edited.ok) return;

    const afterEdit = await listIntentRevisionsForBid(placed.bid.id);
    expect(afterEdit).toHaveLength(2);
    expect(afterEdit[1]?.brandLabel).toBe("Rev Co Edited");
    expect(afterEdit[1]?.tradeLabel).toBe("rev trade two");
    expect(afterEdit[1]?.standingUsd).toBe(2500);
    expect(afterEdit[1]?.artworkUrl).toBe("https://example.com/b.png");
    expect(afterEdit[1]?.createdAt >= afterEdit[0]!.createdAt).toBe(true);
  });
});
