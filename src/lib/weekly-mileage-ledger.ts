/**
 * Weekly mileage ledger (FEATURES P3 #29).
 * Empty display scaffold — no invented miles, no reserved VIN, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const WEEKLY_MILEAGE_LEDGER_LEAD = `Weekly mileage ledger. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there are no miles to log. Buyout ${formatUsd(GOAL_USD)} buys the truck; miles still start after delivery. No invented odometer. No reserved VIN until an order exists. Still no card charge.`;

export const WEEKLY_MILEAGE_LEDGER_FACTS = [
  {
    id: "empty-until-truck",
    text: "Ledger stays empty until a real truck exists. No invented weekly miles.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No mileage rows.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. Miles still wait on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function weeklyMileageLedgerCopyIsSafe(): boolean {
  const blob = [
    WEEKLY_MILEAGE_LEDGER_LEAD,
    ...WEEKLY_MILEAGE_LEDGER_FACTS.map((fact) => fact.text),
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
