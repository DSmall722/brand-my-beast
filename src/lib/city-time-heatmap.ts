/**
 * City time-in-market heatmap (FEATURES P3 #30).
 * Empty display scaffold — no invented dwell times, no reserved VIN, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const CITY_TIME_HEATMAP_LEAD = `City time-in-market heatmap. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there is no route to heat. Buyout ${formatUsd(GOAL_USD)} buys the truck; dwell still waits on delivery. No invented city hours. No reserved VIN until an order exists. Still no card charge.`;

export const CITY_TIME_HEATMAP_FACTS = [
  {
    id: "empty-until-truck",
    text: "Heatmap stays empty until a real truck exists. No invented city dwell times.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No heat cells.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. Time-in-market still waits on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function cityTimeHeatmapCopyIsSafe(): boolean {
  const blob = [
    CITY_TIME_HEATMAP_LEAD,
    ...CITY_TIME_HEATMAP_FACTS.map((fact) => fact.text),
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
