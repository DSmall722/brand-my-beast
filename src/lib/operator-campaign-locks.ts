import { CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export type OperatorCampaignLocks = {
  floorUsd: number;
  goalUsd: number;
  closeAt: string | null;
  editable: false;
};

export function operatorCampaignLocks(): OperatorCampaignLocks {
  return {
    floorUsd: FLOOR_USD,
    goalUsd: GOAL_USD,
    closeAt: CLOSE_AT,
    editable: false,
  };
}

export function assertOperatorCampaignLocks(): boolean {
  const locks = operatorCampaignLocks();
  return (
    locks.floorUsd === 35_000 &&
    locks.goalUsd === 120_000 &&
    locks.closeAt === "2026-12-31T17:00:00.000Z" &&
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
