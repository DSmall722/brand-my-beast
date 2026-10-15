export const BRAND = {
  name: "BrandMyBeast",
  handle: "@BrandMyBeast",
  email: "hello@brandmybeast.com",
  domain: "brandmybeast.com",
  operator: "the operator",
} as const;

export const PUBLIC_SITE_ORIGIN = "https://www.brandmybeast.com" as const;

export const FLOOR_USD = 35_000;

export const GOAL_USD = 120_000;

export const PROXY_MAX_CAP_USD = GOAL_USD;

export const OPEN_AT = "2026-10-06T16:00:00.000Z";

export const CLOSE_AT: string | null = "2026-11-02T17:00:00.000Z";

export const SEATS_OPEN =
  process.env.SEATS_OPEN !== "false" && process.env.SEATS_OPEN !== "0";

export const MAINTENANCE =
  process.env.MAINTENANCE === "true" || process.env.MAINTENANCE === "1";

export const TRUCK_EXISTS =
  process.env.TRUCK_EXISTS === "true" || process.env.TRUCK_EXISTS === "1";

export const DEPOSIT_PERCENT = 20;

export type FinishAtFloor = "wrap";
export type FinishAtGoal = "wrap" | "wrap_or_etch";

export type Panel = {
  id: string;
  name: string;
  openingUsd: number;
  finishAtFloor: FinishAtFloor;
  finishAtGoal: FinishAtGoal;
};

export const PANELS: readonly Panel[] = [
  {
    id: "hood",
    name: "Hood",
    openingUsd: 2500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "front-fascia",
    name: "Front Fascia",
    openingUsd: 2000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "front-bumper",
    name: "Front Bumper",
    openingUsd: 500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap",
  },
  {
    id: "driver-door",
    name: "Driver Side Doors",
    openingUsd: 4500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "driver-rear-quarter",
    name: "Driver Rear Sail",
    openingUsd: 1000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "driver-bed",
    name: "Driver Side Bed",
    openingUsd: 2000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "passenger-door",
    name: "Passenger Side Doors",
    openingUsd: 4500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "passenger-rear-quarter",
    name: "Passenger Rear Sail",
    openingUsd: 1000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "passenger-bed",
    name: "Passenger Side Bed",
    openingUsd: 2000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "tailgate",
    name: "Tailgate",
    openingUsd: 2500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "rear-bumper",
    name: "Rear Bumper",
    openingUsd: 500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap",
  },
] as const;

export function isEtchable(panel: Panel): boolean {
  return panel.finishAtGoal === "wrap_or_etch";
}

export function isEtchUnlocked(raisedUsd: number): boolean {
  return raisedUsd >= GOAL_USD;
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function currentBidUsd(
  openingUsd: number,
  highestBidUsd: number | null | undefined,
): number {
  if (
    highestBidUsd != null &&
    Number.isFinite(highestBidUsd) &&
    highestBidUsd > 0
  ) {
    return highestBidUsd;
  }
  return openingUsd;
}

export function formatIntegerUsd(amount: number): string {
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    throw new Error("Amount must be an integer dollar value");
  }
  return formatUsd(amount);
}

export function moneyBandCopy(raisedUsd: number): string {
  if (raisedUsd < FLOOR_USD) {
    return "Full refund. No order. No wrap. No Immortal Etch.";
  }
  if (raisedUsd < GOAL_USD) {
    return "Cyberbeast order + wrap. Immortal Etch not included.";
  }
  return "Campaign buys the truck. Whole-truck + Immortal Etch package.";
}

export function shortfallToFloorUsd(pledgedUsd: number): number {
  if (!Number.isFinite(pledgedUsd) || pledgedUsd < 0) {
    throw new Error("pledgedUsd must be a non-negative finite number");
  }
  return Math.max(0, FLOOR_USD - pledgedUsd);
}

export function shortfallToGoalUsd(pledgedUsd: number): number {
  if (!Number.isFinite(pledgedUsd) || pledgedUsd < 0) {
    throw new Error("pledgedUsd must be a non-negative finite number");
  }
  return Math.max(0, GOAL_USD - pledgedUsd);
}

export function floorProgressPercent(pledgedUsd: number): number {
  if (!Number.isFinite(pledgedUsd) || pledgedUsd < 0) {
    throw new Error("pledgedUsd must be a non-negative finite number");
  }
  const rounded = Math.round((pledgedUsd / FLOOR_USD) * 100);
  if (pledgedUsd < FLOOR_USD) return Math.min(99, Math.max(0, rounded));
  return Math.min(100, rounded);
}

export function goalProgressPercent(pledgedUsd: number): number {
  if (!Number.isFinite(pledgedUsd) || pledgedUsd < 0) {
    throw new Error("pledgedUsd must be a non-negative finite number");
  }
  return Math.min(100, Math.round((pledgedUsd / GOAL_USD) * 100));
}

export function floorMarkerPercentOnGoalTrack(): number {
  return Math.round((FLOOR_USD / GOAL_USD) * 1000) / 10;
}

export const WRECK_REFUND_RULE_IDS = [
  "campaign-miss",
  "wrap-pro-rata",
  "immortal-fragment",
] as const;
