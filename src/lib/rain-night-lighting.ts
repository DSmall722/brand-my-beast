/**
 * Rain/night lighting after buyout (FEATURES P5 #50).
 * Display promise only — not a livestream, not a close clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const RAIN_NIGHT_LIGHTING_LEAD = `Rain and night lighting is a post-buyout story. It unlocks only after ${formatUsd(GOAL_USD)}. Miss ${formatUsd(FLOOR_USD)} and there is no truck, no lighting pass. Preview shaders on the panel seat stay preview only. Not a livestream. No reserved VIN. Still no card charge.`;

export const RAIN_NIGHT_LIGHTING_FACTS = [
  {
    id: "buyout-unlock",
    text: `Rain/night lighting content unlocks only at ${formatUsd(GOAL_USD)} buyout.`,
  },
  {
    id: "preview-only",
    text: "Day/night/wet/dirty shaders on the seat stay preview only — not a photo of the truck.",
  },
  {
    id: "no-livestream",
    text: "Not a livestream. Not a close clock. No invented lighting price.",
  },
  {
    id: "floor-miss",
    text: `Under ${formatUsd(FLOOR_USD)}: full refund. No order. No rain/night pass.`,
  },
] as const;

export function rainNightLightingCopyIsSafe(): boolean {
  const blob = [
    RAIN_NIGHT_LIGHTING_LEAD,
    ...RAIN_NIGHT_LIGHTING_FACTS.map((fact) => fact.text),
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
