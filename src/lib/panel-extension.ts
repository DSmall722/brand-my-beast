/**
 * Slice 9.3 — per-panel soft-close extension timestamp.
 * Never sets campaign CLOSE_AT. Copy stays PUBLIC_COPY-safe.
 */

import { CLOSE_AT, PANELS, type Panel } from "./campaign";
import { PUBLIC_COPY } from "./public-copy";

export type PanelExtendedUntil = string | null;

export function isKnownPanelId(panelId: string): panelId is Panel["id"] {
  return PANELS.some((panel) => panel.id === panelId);
}

/** Reject anything that would look like setting the campaign close clock. */
export function assertCloseAtUntouched(): void {
  if (CLOSE_AT !== null) {
    throw new Error("CLOSE_AT must stay null. Do not start the campaign clock.");
  }
}

export function parsePanelExtendedUntil(
  raw: unknown,
): { ok: true; panelExtendedUntil: PanelExtendedUntil } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, panelExtendedUntil: null };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "panelExtendedUntil must be an ISO timestamp or empty." };
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: true, panelExtendedUntil: null };
  }
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) {
    return { ok: false, error: "panelExtendedUntil must be a valid ISO timestamp." };
  }
  return { ok: true, panelExtendedUntil: new Date(ms).toISOString() };
}

export function panelExtendedUntilCopy(until: PanelExtendedUntil): {
  heading: string;
  body: string;
  isSet: boolean;
} {
  assertCloseAtUntouched();
  const heading = PUBLIC_COPY.panelExtension.heading;
  if (!until) {
    return {
      heading,
      body: PUBLIC_COPY.panelExtension.unset,
      isSet: false,
    };
  }
  return {
    heading,
    body: `${PUBLIC_COPY.panelExtension.setLead} ${until}. ${PUBLIC_COPY.panelExtension.setTail}`,
    isSet: true,
  };
}
