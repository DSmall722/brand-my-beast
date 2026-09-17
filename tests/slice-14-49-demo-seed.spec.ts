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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import {
  listBidsWithStatus,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import { seedDemoAllowed, seedDemoMixedBoard } from "../src/lib/seed-demo";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.49 — local demo seed: 3 pending, 1 approved, 1 outbid. CI only.
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

const ROOT = process.cwd();

test.describe("slice 14.49: local demo seed 3 pending / 1 approved / 1 outbid", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    // Do not leave approved standing on the shared CI memory board.
    await resetIntentStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(PANELS).toHaveLength(12);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("seed refuses production runtimes", () => {
    expect(seedDemoAllowed({ VERCEL_ENV: "production" })).toBe(false);
    expect(seedDemoAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(seedDemoAllowed({ INTENT_MODE: "memory" })).toBe(true);
  });

  test("scripts/seed-demo.sh refuses production", () => {
    const sh = readFileSync(join(ROOT, "scripts/seed-demo.sh"), "utf8");
    expect(sh).toMatch(/VERCEL_ENV/);
    expect(sh).toMatch(/production/);
    expect(sh).toMatch(/seed-demo/);
    expect(sh.toLowerCase()).not.toMatch(/\bstripe\b/);
    expect(sh).not.toMatch(/\bCLOSE_AT=/);
  });

  test("seedDemoMixedBoard yields 3 pending / 1 approved / 1 outbid", async () => {
    const seeded = await seedDemoMixedBoard();
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;
    expect(seeded.pending).toBe(3);
    expect(seeded.approved).toBe(1);
    expect(seeded.outbid).toBe(1);
    expect(seeded.closeAt).toBeNull();

    expect((await listBidsWithStatus("listed")).length).toBe(3);
    expect((await listBidsWithStatus("approved")).length).toBe(1);
    expect((await listBidsWithStatus("outbid")).length).toBe(1);
  });

  test("POST /api/test/seed-demo returns the same counts", async ({
    request,
  }) => {
    const res = await request.post("/api/test/seed-demo");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      ok: boolean;
      pending: number;
      approved: number;
      outbid: number;
      closeAt: null;
    };
    expect(body.ok).toBe(true);
    expect(body.pending).toBe(3);
    expect(body.approved).toBe(1);
    expect(body.outbid).toBe(1);
    expect(body.closeAt).toBeNull();
  });
});
