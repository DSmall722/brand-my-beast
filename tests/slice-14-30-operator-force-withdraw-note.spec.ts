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
import {
  FORCE_WITHDRAW_APPROVED_NOTE_ERROR,
  forceWithdrawApprovedSeat,
  getIntentBidById,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
  withdrawPendingIntent,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.30 — Operator note required when forcing a withdraw of an
 * approved seat. CLOSE_AT null. No Stripe. Hold-mode untouched. No clock.
 */

test.describe("slice 14.30: operator note required on force-withdraw approved", () => {
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
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("force-withdraw approved refuses empty note; note succeeds", async () => {
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "fw1430-brand",
      brandLabel: "Force WD Co",
      tradeLabel: "force vinyl",
      standingUsd: 3200,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const approved = await setIntentStatus(listed.bid.id, "approved", {
      note: "Seat clears checklist.",
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.bid.status).toBe("approved");

    const noNote = await setIntentStatus(approved.bid.id, "withdrawn");
    expect(noNote.ok).toBe(false);
    if (noNote.ok) return;
    expect(noNote.error).toBe(FORCE_WITHDRAW_APPROVED_NOTE_ERROR);

    const blank = await forceWithdrawApprovedSeat({
      bidId: approved.bid.id,
      note: "  ",
    });
    expect(blank.ok).toBe(false);
    if (blank.ok) return;
    expect(blank.error).toBe(FORCE_WITHDRAW_APPROVED_NOTE_ERROR);

    const stillApproved = await getIntentBidById(approved.bid.id);
    expect(stillApproved?.status).toBe("approved");

    const forced = await forceWithdrawApprovedSeat({
      bidId: approved.bid.id,
      note: "Bidder pulled brand — operator force withdraw.",
      expectedUpdatedAt: approved.bid.updatedAt,
    });
    expect(forced.ok).toBe(true);
    if (!forced.ok) return;
    expect(forced.bid.status).toBe("withdrawn");
    expect(forced.bid.deletedAt).toBeTruthy();

    const live = await getIntentBidById(approved.bid.id);
    expect(live?.status).toBe("withdrawn");
    expect(live?.deletedAt).toBeTruthy();

    // Listed pending withdraw still needs no operator note.
    const pending = await placeIntentBid({
      panelId: "rear-bumper",
      userId: "fw1430-pending",
      brandLabel: "Pending WD",
      tradeLabel: "pending snacks",
      standingUsd: 900,
    });
    expect(pending.ok).toBe(true);
    if (!pending.ok) return;
    const soft = await withdrawPendingIntent({
      bidId: pending.bid.id,
      userId: "fw1430-pending",
    });
    expect(soft.ok).toBe(true);
    if (!soft.ok) return;
    expect(soft.bid.status).toBe("withdrawn");

    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toContain("FORCE_WITHDRAW_APPROVED_NOTE_ERROR");
    expect(src).toContain("forceWithdrawApprovedSeat");
    expect(src).toContain("Slice 14.30");
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
