/**
 * Clemson Saturday lock (FEATURES P4 #40).
 * Empty display scaffold — no invented lock fee, no reserved VIN, no close clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const CLEMSON_SATURDAY_LOCK_LEAD = `Clemson Saturday lock. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there is no Saturday to lock. Buyout ${formatUsd(GOAL_USD)} buys the truck; the lock still waits on delivery. No invented lock fee. No reserved VIN until an order exists. Still no card charge.`;

export const CLEMSON_SATURDAY_LOCK_FACTS = [
  {
    id: "empty-until-truck",
    text: "Lock board stays empty until a real truck exists. No invented lock fee.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No Clemson Saturday lock.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. Saturday lock still waits on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function clemsonSaturdayLockCopyIsSafe(): boolean {
  const blob = [
    CLEMSON_SATURDAY_LOCK_LEAD,
    ...CLEMSON_SATURDAY_LOCK_FACTS.map((fact) => fact.text),
  ].join(" ");
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\blivestream\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(blob) &&
    !/\$\d/.test(blob.replace(/\$58,000/g, "").replace(/\$120,000/g, ""))
  );
}
