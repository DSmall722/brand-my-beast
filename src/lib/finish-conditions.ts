/**
 * Day/night/wet/dirty finish shaders (SLICES 3.6 / FEATURES P2 #19).
 * CSS preview toggles only — not proof photos of a truck that does not exist.
 * No capture, no clock.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const FINISH_CONDITIONS = [
  { id: "day", label: "Day", hint: "Hard sun on stainless" },
  { id: "night", label: "Night", hint: "Highway sodium wash" },
  { id: "wet", label: "Wet", hint: "Rain sheen on steel" },
  { id: "dirty", label: "Dirty", hint: "Road film + grit" },
] as const;

export type FinishCondition = (typeof FINISH_CONDITIONS)[number]["id"];

/** Seat lead: toggles are shaders, not documentary photos. */
export const FINISH_CONDITIONS_LEAD = `Day / night / wet / dirty toggles. Shader preview only — not proof photos of a truck that does not exist. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. Still no card charge.`;

export function isFinishCondition(value: string): value is FinishCondition {
  return FINISH_CONDITIONS.some((row) => row.id === value);
}

export function finishConditionLabel(id: FinishCondition): string {
  return FINISH_CONDITIONS.find((row) => row.id === id)?.label ?? id;
}

export function finishConditionsCopyIsSafe(): boolean {
  const lower = FINISH_CONDITIONS_LEAD.toLowerCase();
  return (
    lower.includes("toggle") &&
    lower.includes("not proof") &&
    !/\blease\b/.test(lower) &&
    !FINISH_CONDITIONS_LEAD.includes("CLOSE_AT") &&
    !FINISH_CONDITIONS_LEAD.includes("South Carolina home loop") &&
    !FINISH_CONDITIONS_LEAD.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\blivestream\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(FINISH_CONDITIONS_LEAD)
  );
}
