/**
 * Truck-order tracker after floor (FEATURES P3 #26).
 * Display status board only — no reserved VIN, no close clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const TRUCK_ORDER_TRACKER_LEAD = `Truck-order tracker. After ${formatUsd(FLOOR_USD)} the order path opens on this board. Miss the floor and there is no order. Buyout ${formatUsd(GOAL_USD)} buys the truck and unlocks etch. No reserved VIN until an order exists. Still no card charge.`;

export const TRUCK_ORDER_TRACKER_FACTS = [
  {
    id: "floor-unlock",
    text: `Order-path tracking unlocks only after ${formatUsd(FLOOR_USD)}. Under the floor: full refund, no order.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this page. VIN appears only after a real order exists.",
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck and etch unlocks. Display only — not a close clock.`,
  },
  {
    id: "no-livestream",
    text: "Not a livestream. Not a tweet. No invented order fee.",
  },
] as const;

export function truckOrderTrackerCopyIsSafe(): boolean {
  const blob = [
    TRUCK_ORDER_TRACKER_LEAD,
    ...TRUCK_ORDER_TRACKER_FACTS.map((fact) => fact.text),
  ].join(" ");
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(blob) &&
    !/\$\d/.test(blob.replace(/\$58,000/g, "").replace(/\$120,000/g, ""))
  );
}
