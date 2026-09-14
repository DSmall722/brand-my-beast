/**
 * Single source of truth for public campaign numbers and panel inventory.
 * Keep in lockstep with CAMPAIGN.md and RULES.md. CAMPAIGN.md wins conflicts.
 */

export const BRAND = {
  name: "BrandMyBeast",
  handle: "@BrandMyBeast",
  email: "hello@brandmybeast.com",
  domain: "brandmybeast.com",
  operator: "the operator",
} as const;

/** Order + wrap floor. Miss = full refund. Dollars, not cents. */
export const FLOOR_USD = 58_000;

/** Buyout. Immortal etch unlocks only at this mark. */
export const GOAL_USD = 120_000;

/** Unset until P3 money path ships. Do not invent a close date. */
export const CLOSE_AT: string | null = null;

/** Deposit share to list a bid (P2/P3). Shown on P1 as rules copy only. */
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

/**
 * Twelve panels. Eight steel faces take Immortal etch only after GOAL_USD.
 * Etchable = finishAtGoal === "wrap_or_etch".
 */
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
    name: "Front fascia",
    openingUsd: 1200,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap",
  },
  {
    id: "driver-door",
    name: "Driver door",
    openingUsd: 1500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "passenger-door",
    name: "Passenger door",
    openingUsd: 1500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "driver-bed",
    name: "Driver bed",
    openingUsd: 2000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "passenger-bed",
    name: "Passenger bed",
    openingUsd: 2000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "driver-rear-quarter",
    name: "Driver rear quarter",
    openingUsd: 1000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "passenger-rear-quarter",
    name: "Passenger rear quarter",
    openingUsd: 1000,
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
    id: "tonneau",
    name: "Tonneau",
    openingUsd: 800,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap",
  },
  {
    id: "roof",
    name: "Roof",
    openingUsd: 600,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap",
  },
  {
    id: "rear-fascia",
    name: "Rear fascia",
    openingUsd: 500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap",
  },
] as const;

export function isEtchable(panel: Panel): boolean {
  return panel.finishAtGoal === "wrap_or_etch";
}

/** Etch is locked unless raised dollars reach the buyout. */
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

export function moneyBandCopy(raisedUsd: number): string {
  if (raisedUsd < FLOOR_USD) {
    return "Full refund. No order. No wrap. No etch.";
  }
  if (raisedUsd < GOAL_USD) {
    return "Cyberbeast order + wrap. Immortal etch stays locked.";
  }
  return "Campaign buys the truck. Immortal etch unlocks on eight steel faces.";
}

/** Dollars still needed to clear the floor. Never negative. */
export function shortfallToFloorUsd(pledgedUsd: number): number {
  if (!Number.isFinite(pledgedUsd) || pledgedUsd < 0) {
    throw new Error("pledgedUsd must be a non-negative finite number");
  }
  return Math.max(0, FLOOR_USD - pledgedUsd);
}

/** Dollars still needed to clear the buyout. Never negative. */
export function shortfallToGoalUsd(pledgedUsd: number): number {
  if (!Number.isFinite(pledgedUsd) || pledgedUsd < 0) {
    throw new Error("pledgedUsd must be a non-negative finite number");
  }
  return Math.max(0, GOAL_USD - pledgedUsd);
}

/** Progress toward the floor, capped at 100. */
export function floorProgressPercent(pledgedUsd: number): number {
  if (!Number.isFinite(pledgedUsd) || pledgedUsd < 0) {
    throw new Error("pledgedUsd must be a non-negative finite number");
  }
  return Math.min(100, Math.round((pledgedUsd / FLOOR_USD) * 100));
}

/** Progress toward the buyout on the visual vault track, capped at 100. */
export function goalProgressPercent(pledgedUsd: number): number {
  if (!Number.isFinite(pledgedUsd) || pledgedUsd < 0) {
    throw new Error("pledgedUsd must be a non-negative finite number");
  }
  return Math.min(100, Math.round((pledgedUsd / GOAL_USD) * 100));
}

/** Floor marker position on a 0→buyout vault track (percent). */
export function floorMarkerPercentOnGoalTrack(): number {
  return Math.round((FLOOR_USD / GOAL_USD) * 1000) / 10;
}

/**
 * Public wreck + refund rules (RULES.md). Contract text only —
 * no Stripe cash path until P3.
 */
export const WRECK_REFUND_RULES = [
  {
    id: "campaign-miss",
    title: "Campaign miss",
    body: "Under the floor: full refund, including deposits. No order. No wrap. No etch.",
  },
  {
    id: "wrap-pro-rata",
    title: "Wrap term",
    body: "If the truck is totaled or sold before month 12, wrap seats get a pro-rata refund for the months left.",
  },
  {
    id: "immortal-fragment",
    title: "Immortal etch",
    body: "After install, etch winners get a physical fragment of the etched panel plus the vault certificate. No cash refund of the etch premium.",
  },
] as const;
