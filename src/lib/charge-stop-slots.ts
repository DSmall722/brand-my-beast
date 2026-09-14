/**
 * Charge-stop takeover slots (FEATURES P4 #38).
 * Empty display scaffold — no invented slot prices, no reserved VIN, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const CHARGE_STOP_SLOTS_LEAD = `Charge-stop takeover slots. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there is no stop to take over. Buyout ${formatUsd(GOAL_USD)} buys the truck; slots still wait on delivery. No invented slot prices. No reserved VIN until an order exists. Still no card charge.`;

export const CHARGE_STOP_SLOTS_FACTS = [
  {
    id: "empty-until-truck",
    text: "Slot board stays empty until a real truck exists. No invented takeover prices.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No charge-stop slots.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. Takeover slots still wait on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function chargeStopSlotsCopyIsSafe(): boolean {
  const blob = [
    CHARGE_STOP_SLOTS_LEAD,
    ...CHARGE_STOP_SLOTS_FACTS.map((fact) => fact.text),
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
