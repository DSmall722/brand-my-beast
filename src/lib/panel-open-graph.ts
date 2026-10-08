import { BRAND, type Panel } from "./campaign";
import { panelDisplayName } from "./panel-board";

/** Per-panel document title. Pipe, display caps. Not the Stripe panel string. */
export function panelOpenGraphTitle(panel: Pick<Panel, "name">): string {
  return `${panelDisplayName(panel.name)} | ${BRAND.name}`;
}
