/**
 * Sighting bounty cards (FEATURES P4 #44).
 * Empty display scaffold — no invented bounty dollars, no impressions, no reserved VIN, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const SIGHTING_BOUNTY_CARDS_LEAD = `Sighting bounty cards. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there is no sighting to reward. Buyout ${formatUsd(GOAL_USD)} buys the truck; cards still wait on delivery. No invented bounty dollars. No invented impressions. No reserved VIN until an order exists. Still no card charge.`;

export const SIGHTING_BOUNTY_CARDS_FACTS = [
  {
    id: "empty-until-truck",
    text: "Bounty board stays empty until a real truck exists. No invented bounty dollars.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No sighting bounty cards.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. Bounty cards still wait on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function sightingBountyCardsCopyIsSafe(): boolean {
  const blob = [
    SIGHTING_BOUNTY_CARDS_LEAD,
    ...SIGHTING_BOUNTY_CARDS_FACTS.map((fact) => fact.text),
  ].join(" ");
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle") &&
    !/\blivestream\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(blob) &&
    !/\$\d/.test(blob.replace(/\$58,000/g, "").replace(/\$120,000/g, "")) &&
    lower.includes("no invented bounty") &&
    lower.includes("no invented impressions")
  );
}
