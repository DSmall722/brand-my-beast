import { BRAND, type Panel } from "./campaign";

/**
 * Slice 14.16 — per-panel Open Graph / document title.
 * Format: `{Panel name} — BrandMyBeast` (em dash).
 */
export function panelOpenGraphTitle(panel: Pick<Panel, "name">): string {
  return `${panel.name} — ${BRAND.name}`;
}
