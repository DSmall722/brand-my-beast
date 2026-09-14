/**
 * City ping to the panel winner (FEATURES P3 #35).
 * Empty display scaffold — no invented pings, no reserved VIN, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const CITY_PING_WINNER_LEAD = `City ping to the panel winner. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there is no city to ping. Buyout ${formatUsd(GOAL_USD)} buys the truck; pings still wait on delivery. No invented city pings. No reserved VIN until an order exists. Still no card charge.`;

export const CITY_PING_WINNER_FACTS = [
  {
    id: "empty-until-truck",
    text: "Ping board stays empty until a real truck exists. No invented city pings.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No winner pings.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. City pings still wait on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function cityPingWinnerCopyIsSafe(): boolean {
  const blob = [
    CITY_PING_WINNER_LEAD,
    ...CITY_PING_WINNER_FACTS.map((fact) => fact.text),
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
