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
  countApprovedStandingForPanel,
  listBidsForPanel,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 12.45 — concurrent two bidders on hood → only one approved standing.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.45: concurrent hood bidders → one approved", () => {
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

  test("concurrent approve of two hood bids leaves exactly one approved", async () => {
    const a = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_45_a",
      brandLabel: "Concurrent A",
      tradeLabel: "tools a",
      standingUsd: 2_500,
    });
    expect(a.ok).toBe(true);
    if (!a.ok) return;

    const b = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_45_b",
      brandLabel: "Concurrent B",
      tradeLabel: "tools b",
      standingUsd: 3_500,
    });
    expect(b.ok).toBe(true);
    if (!b.ok) return;

    const [resA, resB] = await Promise.all([
      setIntentStatus(a.bid.id, "approved"),
      setIntentStatus(b.bid.id, "approved"),
    ]);
    expect(resA.ok || resB.ok).toBe(true);

    expect(await countApprovedStandingForPanel("hood")).toBe(1);
    const hood = await listBidsForPanel("hood");
    const approved = hood.filter((bid) => bid.status === "approved");
    expect(approved).toHaveLength(1);
    expect(["Concurrent A", "Concurrent B"]).toContain(approved[0]!.brandLabel);
  });

  test("concurrent place+approve races still end at one approved", async () => {
    const placed = await Promise.all([
      placeIntentBid({
        panelId: "hood",
        userId: "user_12_45_c",
        brandLabel: "Race C",
        tradeLabel: "tools c",
        standingUsd: 2_500,
      }),
      placeIntentBid({
        panelId: "hood",
        userId: "user_12_45_d",
        brandLabel: "Race D",
        tradeLabel: "tools d",
        standingUsd: 4_000,
      }),
    ]);
    expect(placed.every((row) => row.ok)).toBe(true);
    const bids = placed.flatMap((row) => (row.ok ? [row.bid] : []));
    expect(bids).toHaveLength(2);

    await Promise.all(bids.map((bid) => setIntentStatus(bid.id, "approved")));
    expect(await countApprovedStandingForPanel("hood")).toBe(1);
  });
});
