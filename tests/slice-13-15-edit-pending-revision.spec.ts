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
  listIntentRevisionsForBid,
  resetIntentRevisionsForTests,
} from "../src/lib/intent-revision";
import {
  editPendingIntent,
  placeIntentBid,
  resetIntentStoreForTests,
  standingForPanel,
} from "../src/lib/intent-store";

/**
 * Slice 13.15 — edit-while-pending increments the revision table (12.8).
 * Standing unchanged. CLOSE_AT null. No Stripe.
 */
test.describe("slice 13.15: edit-pending increments revisions", () => {
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

  test("each pending edit appends a revision; standing stays put", async () => {
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "ed1315",
      brandLabel: "Edit 1315",
      tradeLabel: "ed1315 snacks",
      standingUsd: 3000,
      artworkUrl: "https://example.com/1315-a.png",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const afterPlace = await listIntentRevisionsForBid(placed.bid.id);
    expect(afterPlace).toHaveLength(1);

    const edit1 = await editPendingIntent({
      bidId: placed.bid.id,
      userId: "ed1315",
      brandLabel: "Edit 1315 One",
      tradeLabel: "ed1315 tools",
      artworkUrl: "https://example.com/1315-b.png",
      expectedUpdatedAt: placed.bid.updatedAt,
    });
    expect(edit1.ok).toBe(true);
    if (!edit1.ok) return;

    const after1 = await listIntentRevisionsForBid(placed.bid.id);
    expect(after1).toHaveLength(2);
    expect(after1[1]?.brandLabel).toBe("Edit 1315 One");
    expect(after1[1]?.tradeLabel).toBe("ed1315 tools");
    expect(after1[1]?.standingUsd).toBe(3000);
    expect(edit1.bid.standingUsd).toBe(3000);
    expect(await standingForPanel("hood")).toBe(3000);

    const edit2 = await editPendingIntent({
      bidId: placed.bid.id,
      userId: "ed1315",
      brandLabel: "Edit 1315 Two",
      tradeLabel: "ed1315 paint",
      artworkUrl: "https://example.com/1315-c.png",
      expectedUpdatedAt: edit1.bid.updatedAt,
    });
    expect(edit2.ok).toBe(true);
    if (!edit2.ok) return;

    const after2 = await listIntentRevisionsForBid(placed.bid.id);
    expect(after2).toHaveLength(3);
    expect(after2[2]?.brandLabel).toBe("Edit 1315 Two");
    expect(after2[2]?.artworkUrl).toBe("https://example.com/1315-c.png");
    expect(after2[2]?.standingUsd).toBe(3000);
    expect(after2[2]!.createdAt >= after2[1]!.createdAt).toBe(true);
    expect(edit2.bid.standingUsd).toBe(3000);
    expect(CLOSE_AT).toBeNull();
  });
});
