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

/** Buyout. Whole-truck + Immortal Etch package. */
export const GOAL_USD = 120_000;

/**
 * Slice 13.12 — hard ceiling for optional proxy max on a panel intent.
 * Same dollar figure as GOAL_USD — not a third money number.
 */
export const PROXY_MAX_CAP_USD = GOAL_USD;

/** Unset until P3 money path ships. Do not invent a close date. */
export const CLOSE_AT: string | null = null;

/**
 * Slice 14.17 — seats accepting panel intents. Separate from CLOSE_AT.
 * Default open when unset. Set SEATS_OPEN=false (or 0) to show waitlist-only
 * on the intent form. Does not set a close date or start the 30-day clock.
 */
export const SEATS_OPEN =
  process.env.SEATS_OPEN !== "false" && process.env.SEATS_OPEN !== "0";

/**
 * Slice 14.41 — site maintenance. Homepage stays up; intent POST refuses
 * with “not taking marks.” Default off when unset. Separate from CLOSE_AT
 * and SEATS_OPEN. Does not start the 30-day clock.
 */
export const MAINTENANCE =
  process.env.MAINTENANCE === "true" || process.env.MAINTENANCE === "1";

/**
 * Truck / order exists. Empty P3–P5 boards stay hidden on /, /account, and
 * /partner while false. Flip via TRUCK_EXISTS=true only after a real order
 * path exists — never invent a VIN.
 */
export const TRUCK_EXISTS =
  process.env.TRUCK_EXISTS === "true" || process.env.TRUCK_EXISTS === "1";

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
 * Eleven panels. Nine steel faces take Immortal etch only after GOAL_USD.
 * Etchable = finishAtGoal === "wrap_or_etch". Front fascia is in.
 * Front bumper + Rear bumper stay wrap-only.
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
    name: "Front fascia (stainless)",
    openingUsd: 2000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "front-bumper",
    name: "Front bumper",
    openingUsd: 500,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap",
  },
  {
    id: "driver-door",
    name: "Driver doors",
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
    name: "Driver bed",
    openingUsd: 2000,
    finishAtFloor: "wrap",
    finishAtGoal: "wrap_or_etch",
  },
  {
    id: "passenger-door",
    name: "Passenger doors",
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
    name: "Passenger bed",
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
    name: "Rear bumper",
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

/**
 * Slice 14.34 — next-minimum (and peer seat money labels) are whole dollars
 * only. Rejects fractional amounts before formatUsd can round them.
 */
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
 * Public wreck + refund FAQ ids (slice 4.4).
 * Homepage copy lives in PUBLIC_COPY.wreck — CAMPAIGN.md money only,
 * no invented legal terms, no Stripe cash path until P3.
 */
export const WRECK_REFUND_RULE_IDS = [
  "campaign-miss",
  "wrap-pro-rata",
  "immortal-fragment",
] as const;
