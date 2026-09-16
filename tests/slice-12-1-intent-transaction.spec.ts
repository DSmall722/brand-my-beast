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
import { assertIntentOnly } from "../src/lib/intent";
import {
  countApprovedStandingForPanel,
  listBidsForPanel,
  loadBoardIntentStats,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 12.1 — place + outbid (+ approve demotion) without double standing.
 * Neon HTTP uses db.batch (non-interactive txn). CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.1: intent place/outbid/approve transaction", () => {
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

  test("store batches place+outbid and demotes prior approved on approve", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toMatch(/db\.batch\(\[outbidOthers,\s*insertListed\]\)/);
    expect(src).toMatch(/db\.batch\(\[demotePrior,\s*approveThis\]\)/);
    expect(src).toMatch(/at most one approved standing per panel/);
    expect(src).not.toMatch(/from ["']stripe["']/);
    expect(src).not.toMatch(/\bCLOSE_AT\b/);
  });

  test("place outbids prior listed on the same panel", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_1_a",
      brandLabel: "Alpha Co",
      tradeLabel: "alpha snacks",
      standingUsd: 2500,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_1_b",
      brandLabel: "Beta Co",
      tradeLabel: "beta tools",
      standingUsd: 3000,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const panel = await listBidsForPanel("hood");
    expect(panel.find((b) => b.id === first.bid.id)?.status).toBe("outbid");
    expect(panel.find((b) => b.id === second.bid.id)?.status).toBe("listed");
    assertIntentOnly(second.bid);
  });

  test("approve demotes prior approved — never two standing on one panel", async () => {
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_1_stand_a",
      brandLabel: "Stand A",
      tradeLabel: "stand a trade",
      standingUsd: 2500,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const approvedA = await setIntentStatus(first.bid.id, "approved");
    expect(approvedA.ok).toBe(true);
    if (!approvedA.ok) return;
    expect(await countApprovedStandingForPanel("hood")).toBe(1);

    const challenger = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_1_stand_b",
      brandLabel: "Stand B",
      tradeLabel: "stand b trade",
      standingUsd: 3500,
    });
    expect(challenger.ok).toBe(true);
    if (!challenger.ok) return;

    const approvedB = await setIntentStatus(challenger.bid.id, "approved");
    expect(approvedB.ok).toBe(true);
    if (!approvedB.ok) return;
    expect(approvedB.bid.status).toBe("approved");

    expect(await countApprovedStandingForPanel("hood")).toBe(1);
    const panel = await listBidsForPanel("hood");
    expect(panel.find((b) => b.id === first.bid.id)?.status).toBe("outbid");
    expect(panel.find((b) => b.id === challenger.bid.id)?.status).toBe(
      "approved",
    );

    const stats = await loadBoardIntentStats();
    expect(stats.pledgedUsd).toBe(3500);
    expect(stats.seatedPanels).toBe(1);
  });
});
