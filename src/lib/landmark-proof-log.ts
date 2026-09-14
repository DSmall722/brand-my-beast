/**
 * Landmark proof log (FEATURES P3 #31).
 * Empty display scaffold — no invented visits, no reserved VIN, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const LANDMARK_PROOF_LOG_LEAD = `Landmark proof log. Empty until the truck exists. Miss ${formatUsd(FLOOR_USD)} and there is no route to prove. Buyout ${formatUsd(GOAL_USD)} buys the truck; proofs still wait on delivery. No invented visits. No reserved VIN until an order exists. Still no card charge.`;

export const LANDMARK_PROOF_LOG_FACTS = [
  {
    id: "empty-until-truck",
    text: "Log stays empty until a real truck exists. No invented landmark visits.",
  },
  {
    id: "floor-gate",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No proof rows.`,
  },
  {
    id: "buyout-context",
    text: `At ${formatUsd(GOAL_USD)} the campaign buys the truck. Proofs still wait on delivery — not a close clock.`,
  },
  {
    id: "no-vin",
    text: "No reserved VIN on this board. VIN appears only after a real order exists.",
  },
] as const;

export function landmarkProofLogCopyIsSafe(): boolean {
  const blob = [
    LANDMARK_PROOF_LOG_LEAD,
    ...LANDMARK_PROOF_LOG_FACTS.map((fact) => fact.text),
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
