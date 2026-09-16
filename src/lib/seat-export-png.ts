/**
 * Slice 10.6 — export one PNG per seat.
 * Auth-gated server route. Preview only. No Stripe. No permanent vinyl.
 */

import { BRAND, FLOOR_USD, GOAL_USD, formatUsd, type Panel } from "./campaign";
import { PUBLIC_COPY } from "./public-copy";

export const SEAT_EXPORT_PNG_PATH_PREFIX = "/api/panels/";
export const SEAT_EXPORT_PNG_PATH_SUFFIX = "/export";

export function seatExportPngPath(panelId: Panel["id"]): string {
  return `${SEAT_EXPORT_PNG_PATH_PREFIX}${panelId}${SEAT_EXPORT_PNG_PATH_SUFFIX}`;
}

export function seatExportPngFilename(panelId: Panel["id"]): string {
  return `brandmybeast-${panelId}.png`;
}

export function seatExportFinishBadge(etchable: boolean): string {
  return etchable
    ? PUBLIC_COPY.panels.badgeEtch
    : PUBLIC_COPY.panels.badgeWrap;
}

export function seatExportStandingLabel(brand: string | null): string {
  const trimmed = brand?.trim();
  return trimmed ? trimmed : "Open seat";
}

export function seatExportPngCopyIsSafe(blob: string): boolean {
  const lower = blob.toLowerCase();
  if (lower.includes("lease")) return false;
  if (blob.includes("CLOSE_AT")) return false;
  if (lower.includes("stripe")) return false;
  if (lower.includes("permanent vinyl")) return false;
  if (!blob.includes(BRAND.name)) return false;
  if (!blob.includes(formatUsd(FLOOR_USD))) return false;
  if (!blob.includes(formatUsd(GOAL_USD))) return false;
  return true;
}
