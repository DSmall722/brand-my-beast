/**
 * QR / NFC raw scan counter (FEATURES P3 #34).
 * Empty display scaffold — no invented scan counts, no reserved VIN, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const QR_NFC_SCAN_COUNTER_LEAD = `QR / NFC raw scan counter. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there is nothing to scan. Buyout ${formatUsd(GOAL_USD)} buys the truck; scans still wait on delivery. No invented scan counts. No reserved VIN until an order exists. Still no card charge.`;

export const QR_NFC_SCAN_COUNTER_FACTS = [
  {
    id: "empty-until-truck",
    text: "Counter stays at zero until a real truck exists. No invented scan counts.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No scan tally.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. Raw scans still wait on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function qrNfcScanCounterCopyIsSafe(): boolean {
  const blob = [
    QR_NFC_SCAN_COUNTER_LEAD,
    ...QR_NFC_SCAN_COUNTER_FACTS.map((fact) => fact.text),
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
