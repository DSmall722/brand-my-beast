/**
 * Route-day detour buyout (FEATURES P4 #39).
 * Empty display scaffold — no invented buyout prices, no reserved VIN, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const ROUTE_DETOUR_BUYOUT_LEAD = `Route-day detour buyout. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there is no route to buy. Buyout ${formatUsd(GOAL_USD)} buys the truck; detours still wait on delivery. No invented detour prices. No reserved VIN until an order exists. Still no card charge.`;

export const ROUTE_DETOUR_BUYOUT_FACTS = [
  {
    id: "empty-until-truck",
    text: "Detour board stays empty until a real truck exists. No invented buyout prices.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No route-day detours.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. Detour buyouts still wait on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function routeDetourBuyoutCopyIsSafe(): boolean {
  const blob = [
    ROUTE_DETOUR_BUYOUT_LEAD,
    ...ROUTE_DETOUR_BUYOUT_FACTS.map((fact) => fact.text),
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
