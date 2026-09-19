/**
 * Slice 14.49 — local demo seed: 3 pending, 1 approved, 1 outbid. CI only.
 * Resets the intent ledger first. Never runs a capture path. Never sets CLOSE_AT.
 */

import { CLOSE_AT, PANELS } from "./campaign";
import {
  listBidsWithStatus,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "./intent-store";
import { panelBoardMarkFor } from "./panel-board";
import { isProductionRuntime } from "./test-api-gate";

export type NumberedStandingSeat = {
  n: number;
  panelId: string;
  status: "listed";
};

export type SeedDemoResult = {
  ok: true;
  pending: number;
  approved: number;
  outbid: number;
  closeAt: null;
  numberedStanding: readonly NumberedStandingSeat[];
};

export function seedDemoAllowed(
  env: { VERCEL_ENV?: string; NODE_ENV?: string; INTENT_MODE?: string } = process.env,
): boolean {
  if (isProductionRuntime(env)) return false;
  return true;
}

/**
 * Reset + seed a small mixed board for local / CI demos:
 * three listed (pending), one approved, one outbid.
 */
export async function seedDemoMixedBoard(): Promise<
  SeedDemoResult | { ok: false; error: string }
> {
  if (!seedDemoAllowed()) {
    return { ok: false, error: "Demo seed is CI / test only." };
  }
  if (CLOSE_AT != null) {
    return { ok: false, error: "CLOSE_AT must stay null." };
  }
  if (PANELS.length !== 12) {
    return { ok: false, error: "Campaign must define exactly 12 panels." };
  }

  await resetIntentStoreForTests();

  // Three pending (listed) on distinct panels.
  const pendingSpecs = [
    {
      panelId: "hood",
      userId: "demo_pending_1",
      brandLabel: "Demo Pending One",
      tradeLabel: "demo snacks a",
      standingUsd: 2500,
    },
    {
      panelId: "driver-door",
      userId: "demo_pending_2",
      brandLabel: "Demo Pending Two",
      tradeLabel: "demo snacks b",
      standingUsd: 1500,
    },
    {
      panelId: "tailgate",
      userId: "demo_pending_3",
      brandLabel: "Demo Pending Three",
      tradeLabel: "demo snacks c",
      standingUsd: 2500,
    },
  ] as const;

  for (const spec of pendingSpecs) {
    const placed = await placeIntentBid(spec);
    if (!placed.ok) {
      return { ok: false, error: `Pending seed failed: ${placed.error}` };
    }
  }

  // One approved + one outbid on rear-fascia: loser then winner, approve winner.
  const prior = await placeIntentBid({
    panelId: "rear-fascia",
    userId: "demo_outbid_loser",
    brandLabel: "Demo Outbid Co",
    tradeLabel: "demo outbid trade",
    standingUsd: 500,
  });
  if (!prior.ok) {
    return { ok: false, error: `Outbid seed failed: ${prior.error}` };
  }

  const winner = await placeIntentBid({
    panelId: "rear-fascia",
    userId: "demo_approved_winner",
    brandLabel: "Demo Approved Co",
    tradeLabel: "demo approved trade",
    standingUsd: 750,
  });
  if (!winner.ok) {
    return { ok: false, error: `Approved seed failed: ${winner.error}` };
  }

  const approved = await setIntentStatus(winner.bid.id, "approved", {
    note: "Demo seed approve.",
  });
  if (!approved.ok) {
    return { ok: false, error: `Approve seed failed: ${approved.error}` };
  }

  const pending = (await listBidsWithStatus("listed")).length;
  const approvedCount = (await listBidsWithStatus("approved")).length;
  const outbid = (await listBidsWithStatus("outbid")).length;

  if (pending !== 3 || approvedCount !== 1 || outbid !== 1) {
    return {
      ok: false,
      error: `Expected 3 pending / 1 approved / 1 outbid; got ${pending}/${approvedCount}/${outbid}.`,
    };
  }

  const numberedStanding: NumberedStandingSeat[] = [
    { panelId: "hood", status: "listed" },
    { panelId: "tailgate", status: "listed" },
  ].map((row) => {
    const mark = panelBoardMarkFor(row.panelId);
    return { n: mark.n, panelId: row.panelId, status: row.status };
  });
  if (numberedStanding[0]?.n !== 1 || numberedStanding[1]?.n !== 9) {
    return {
      ok: false,
      error: "Numbered standing must be seat 1 and seat 9.",
    };
  }

  return {
    ok: true,
    pending,
    approved: approvedCount,
    outbid,
    closeAt: null,
    numberedStanding,
  };
}
