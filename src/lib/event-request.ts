/**
 * Event request calendar (FEATURES P4 #37).
 * Preference only — no livestream, no close clock, no reserved VIN.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const EVENT_REQUEST_KINDS = [
  { id: "shop-night", label: "Shop night" },
  { id: "campus", label: "Campus" },
  { id: "hometown", label: "Hometown" },
  { id: "rest-stop", label: "Rest stop" },
] as const;

export type EventRequestKindId = (typeof EVENT_REQUEST_KINDS)[number]["id"];

export const EVENT_REQUEST_LEAD = `Ask for a circuit stop after the truck exists. Soft event chips only. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. No livestream. No reserved VIN. No invented impressions. Requested day is not a close clock. Still no card charge.`;

export type EventRequest = {
  id: string;
  email: string;
  kindId: EventRequestKindId;
  requestedDate: string;
  note: string;
  createdAt: string;
};

export function isEventRequestKindId(
  value: string,
): value is EventRequestKindId {
  return EVENT_REQUEST_KINDS.some((row) => row.id === value);
}

export function normalizeEventRequestEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function eventRequestEmailIsValid(raw: string): boolean {
  const email = normalizeEventRequestEmail(raw);
  return email.length >= 5 && email.length <= 254 && email.includes("@");
}

export function normalizeEventRequestNote(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 200);
}

export function normalizeRequestedDate(raw: string): string {
  return raw.trim();
}

export function requestedDateIsValid(raw: string): boolean {
  const date = normalizeRequestedDate(raw);
  if (date.length === 0) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date);
}

export function eventRequestCopyIsSafe(): boolean {
  const blob = [
    EVENT_REQUEST_LEAD,
    ...EVENT_REQUEST_KINDS.map((row) => row.label),
  ].join(" ");
  const lower = blob.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !blob.includes("CLOSE_AT") &&
    !blob.includes("South Carolina home loop") &&
    !blob.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(blob)
  );
}
