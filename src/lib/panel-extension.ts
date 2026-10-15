import { CLOSE_AT, PANELS, type Panel } from "./campaign";
import { PUBLIC_COPY, panelExtensionUnsetCopy } from "./public-copy";

export type PanelExtendedUntil = string | null;

export function isKnownPanelId(panelId: string): panelId is Panel["id"] {
  return PANELS.some((panel) => panel.id === panelId);
}

export function assertCloseAtUntouched(): void {
  void CLOSE_AT;
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
      body: panelExtensionUnsetCopy(),
      isSet: false,
    };
  }
  return {
    heading,
    body: `${PUBLIC_COPY.panelExtension.setLead} ${until}. ${PUBLIC_COPY.panelExtension.setTail}`,
    isSet: true,
  };
}
