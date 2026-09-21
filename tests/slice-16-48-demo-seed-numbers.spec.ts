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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { listBidsWithStatus, resetIntentStoreForTests } from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { panelBoardMarkFor } from "../src/lib/panel-board";
import { seedDemoMixedBoard } from "../src/lib/seed-demo";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.48 — local seed includes numbered standing on seat 1 and 10.
 * Counts stay 3 pending / 1 approved / 1 outbid. CLOSE_AT null. No Stripe.
 */

test.describe("slice 16.48: demo seed numbered standing on seats 1 and 10", () => {
  test.beforeEach(async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(panelBoardMarkFor("hood").n).toBe(1);
    expect(panelBoardMarkFor("tailgate").n).toBe(10);
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("seed lists standing on seat 1 and seat 10", async () => {
    const seeded = await seedDemoMixedBoard();
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;
    expect(seeded.pending).toBe(3);
    expect(seeded.approved).toBe(1);
    expect(seeded.outbid).toBe(1);
    expect(seeded.closeAt).toBeNull();
    expect(seeded.numberedStanding).toEqual([
      { n: 1, panelId: "hood", status: "listed" },
      { n: 10, panelId: "tailgate", status: "listed" },
    ]);

    const listed = await listBidsWithStatus("listed");
    expect(listed.some((bid) => bid.panelId === "hood")).toBe(true);
    expect(listed.some((bid) => bid.panelId === "tailgate")).toBe(true);

    const sh = readFileSync(join(process.cwd(), "scripts/seed-demo.sh"), "utf8");
    expect(sh).toContain("16.48");
    expect(sh).toContain("seat 1");
    expect(sh).toContain("seat 10");
    expect(sh).not.toMatch(/\bCLOSE_AT=/);
  });
});
