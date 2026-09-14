/**
 * Public sighting board. After the truck exists — no bounty, no impressions.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";
import {
  CIRCUIT_STORY_CORRIDORS,
  isCircuitStoryCorridorId,
  type CircuitStoryCorridorId,
} from "./circuit-story";

export const SIGHTING_CORRIDORS = CIRCUIT_STORY_CORRIDORS;
export type SightingCorridorId = CircuitStoryCorridorId;
export const isSightingCorridorId = isCircuitStoryCorridorId;

export const SIGHTING_LEAD = `Log a public sighting after the truck exists. Soft corridor labels only. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. No bounty. No invented impressions. No auto-tweet. Still no card charge.`;

export type Sighting = {
  id: string;
  corridorId: SightingCorridorId;
  note: string;
  createdAt: string;
};

export function normalizeSightingNote(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 200);
}

export function sightingNoteIsValid(raw: string): boolean {
  const note = normalizeSightingNote(raw);
  return note.length >= 4 && note.length <= 200;
}

export function sightingCopyIsSafe(): boolean {
  const blob = [
    SIGHTING_LEAD,
    ...SIGHTING_CORRIDORS.map((row) => row.label),
  ].join(" ");
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle") &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(blob)
  );
}
