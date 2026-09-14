/**
 * Request-a-circuit-story. Preference only — no auto-tweet, no impressions.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const CIRCUIT_STORY_CORRIDORS = [
  { id: "sc", label: "SC" },
  { id: "charlotte", label: "Charlotte" },
  { id: "atlanta", label: "Atlanta" },
  { id: "panhandle", label: "Panhandle" },
  { id: "i26", label: "I-26" },
  { id: "i77", label: "I-77" },
  { id: "i85", label: "I-85" },
  { id: "i95", label: "I-95" },
] as const;

export type CircuitStoryCorridorId =
  (typeof CIRCUIT_STORY_CORRIDORS)[number]["id"];

export const CIRCUIT_STORY_LEAD = `Ask for a circuit story after the truck exists. Soft corridor labels only. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. No invented impressions. No auto-tweet. Still no card charge.`;

export type CircuitStoryRequest = {
  id: string;
  email: string;
  corridorId: CircuitStoryCorridorId;
  note: string;
  createdAt: string;
};

export function isCircuitStoryCorridorId(
  value: string,
): value is CircuitStoryCorridorId {
  return CIRCUIT_STORY_CORRIDORS.some((row) => row.id === value);
}

export function normalizeCircuitStoryEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function circuitStoryEmailIsValid(raw: string): boolean {
  const email = normalizeCircuitStoryEmail(raw);
  return email.length >= 5 && email.length <= 254 && email.includes("@");
}

export function normalizeCircuitStoryNote(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 200);
}

export function circuitStoryCopyIsSafe(): boolean {
  const blob = [
    CIRCUIT_STORY_LEAD,
    ...CIRCUIT_STORY_CORRIDORS.map((row) => row.label),
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
