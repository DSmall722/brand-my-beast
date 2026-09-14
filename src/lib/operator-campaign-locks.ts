/**
 * Slice 2.5 — campaign money + close locks.
 * Operator UI may display these; it must never offer editors.
 * Source of truth stays src/lib/campaign.ts (CAMPAIGN.md wins).
 */

import { CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export type OperatorCampaignLocks = {
  floorUsd: number;
  goalUsd: number;
  closeAt: string | null;
  /** Always false — operator cannot mutate campaign money or close. */
  editable: false;
};

/** Read-only snapshot for /operator. Not a settings form. */
export function operatorCampaignLocks(): OperatorCampaignLocks {
  return {
    floorUsd: FLOOR_USD,
    goalUsd: GOAL_USD,
    closeAt: CLOSE_AT,
    editable: false,
  };
}

/** Merge-gate helper: floor / buyout / close stay at locked constants. */
export function assertOperatorCampaignLocks(): boolean {
  const locks = operatorCampaignLocks();
  return (
    locks.floorUsd === 58_000 &&
    locks.goalUsd === 120_000 &&
    locks.closeAt === null &&
    locks.editable === false
  );
}

export function operatorCampaignLockLabels(): {
  floor: string;
  goal: string;
  close: string;
} {
  const locks = operatorCampaignLocks();
  return {
    floor: formatUsd(locks.floorUsd),
    goal: formatUsd(locks.goalUsd),
    close: locks.closeAt ?? "unset",
  };
}
