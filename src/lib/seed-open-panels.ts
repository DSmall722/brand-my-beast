/**
 * Slice 12.10 — seed board: 12 open panels, zero standing. CI / test only.
 * Never runs a capture path. Never sets CLOSE_AT.
 */

import { CLOSE_AT, PANELS } from "./campaign";
import {
  loadBoardIntentStats,
  resetIntentStoreForTests,
} from "./intent-store";
import { isProductionRuntime } from "./test-api-gate";

export type SeedOpenPanelsResult = {
  ok: true;
  panelCount: number;
  openSeats: number;
  pledgedUsd: number;
  seatedPanels: number;
  closeAt: null;
};

export function seedOpenPanelsAllowed(
  env: { VERCEL_ENV?: string; NODE_ENV?: string; INTENT_MODE?: string } = process.env,
): boolean {
  if (isProductionRuntime(env)) return false;
  return true;
}

/**
 * Reset the intent ledger and return an empty board:
 * twelve panels open, pledged standing $0.
 */
export async function seedOpenPanelsZeroStanding(): Promise<
  SeedOpenPanelsResult | { ok: false; error: string }
> {
  if (!seedOpenPanelsAllowed()) {
    return { ok: false, error: "Seed open panels is CI / test only." };
  }
  if (CLOSE_AT != null) {
    return { ok: false, error: "CLOSE_AT must stay null." };
  }
  if (PANELS.length !== 12) {
    return { ok: false, error: "Campaign must define exactly 12 panels." };
  }

  await resetIntentStoreForTests();
  const board = await loadBoardIntentStats();
  if (board.pledgedUsd !== 0 || board.seatedPanels !== 0) {
    return {
      ok: false,
      error: "Seed left standing on the board; expected zero.",
    };
  }
  if (board.openSeats !== PANELS.length) {
    return {
      ok: false,
      error: `Expected ${PANELS.length} open seats, got ${board.openSeats}.`,
    };
  }

  return {
    ok: true,
    panelCount: PANELS.length,
    openSeats: board.openSeats,
    pledgedUsd: board.pledgedUsd,
    seatedPanels: board.seatedPanels,
    closeAt: null,
  };
}
