/**
 * Day/night/wet/dirty finish shaders (FEATURES P2 #19).
 * CSS preview conditions only — no capture, no clock.
 */

export const FINISH_CONDITIONS = [
  { id: "day", label: "Day", hint: "Hard sun on stainless" },
  { id: "night", label: "Night", hint: "Highway sodium wash" },
  { id: "wet", label: "Wet", hint: "Rain sheen on steel" },
  { id: "dirty", label: "Dirty", hint: "Road film + grit" },
] as const;

export type FinishCondition = (typeof FINISH_CONDITIONS)[number]["id"];

export function isFinishCondition(value: string): value is FinishCondition {
  return FINISH_CONDITIONS.some((row) => row.id === value);
}

export function finishConditionLabel(id: FinishCondition): string {
  return FINISH_CONDITIONS.find((row) => row.id === id)?.label ?? id;
}
