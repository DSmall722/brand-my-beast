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
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  seedOpenPanelsAllowed,
  seedOpenPanelsZeroStanding,
} from "../src/lib/seed-open-panels";

/**
 * Slice 12.10 — seed script: 12 open panels, zero standing. CI only.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.10: seed open panels zero standing", () => {
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
    expect(PANELS).toHaveLength(11);
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

  test("seed refuses production runtimes", () => {
    expect(seedOpenPanelsAllowed({ VERCEL_ENV: "production" })).toBe(false);
    expect(seedOpenPanelsAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(seedOpenPanelsAllowed({ INTENT_MODE: "memory" })).toBe(true);
  });

  test("scripts/seed-open-panels.sh refuses production", () => {
    const sh = readFileSync(
      join(process.cwd(), "scripts/seed-open-panels.sh"),
      "utf8",
    );
    expect(sh).toMatch(/VERCEL_ENV/);
    expect(sh).toMatch(/production/);
    expect(sh).toMatch(/seed-open-panels/);
    expect(sh.toLowerCase()).not.toMatch(/\bstripe\b/);
    expect(sh).not.toMatch(/\bCLOSE_AT=/);
  });

  test("seed clears standing to 12 open / $0 pledged", async ({ request }) => {
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_10_seed",
      brandLabel: "Seed Co",
      tradeLabel: "seed trade",
      standingUsd: 2500,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    const approved = await setIntentStatus(placed.bid.id, "approved");
    expect(approved.ok).toBe(true);

    const seeded = await seedOpenPanelsZeroStanding();
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;
    expect(seeded.panelCount).toBe(11);
    expect(seeded.openSeats).toBe(11);
    expect(seeded.pledgedUsd).toBe(0);
    expect(seeded.seatedPanels).toBe(0);
    expect(seeded.closeAt).toBeNull();

    const res = await request.post("/api/test/seed-open-panels");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      ok: boolean;
      openSeats: number;
      pledgedUsd: number;
      panelCount: number;
      closeAt: null;
    };
    expect(body.ok).toBe(true);
    expect(body.panelCount).toBe(11);
    expect(body.openSeats).toBe(11);
    expect(body.pledgedUsd).toBe(0);
    expect(body.closeAt).toBeNull();
  });
});
