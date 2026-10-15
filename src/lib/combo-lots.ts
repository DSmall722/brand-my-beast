import { FLOOR_USD, GOAL_USD, PANELS, formatUsd, type Panel } from "./campaign";
import { adjacentPanelIds, panelName } from "./panel-clash";

export const COMBO_LOT_LEAD = `List each seat separately — not a joint bid, no combo price. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. Still no card charge.`;

export type ComboLotNeighbor = {
  id: Panel["id"];
  name: string;
  openingUsd: number;
};

export type ComboLot = {
  panelId: Panel["id"];
  panelName: string;
  neighbors: ComboLotNeighbor[];
};

export function comboLotFor(panelId: string): ComboLot {
  const panel = PANELS.find((row) => row.id === panelId);
  const neighbors: ComboLotNeighbor[] = adjacentPanelIds(panelId).flatMap(
    (id) => {
      const neighbor = PANELS.find((row) => row.id === id);
      if (!neighbor) return [];
      return [
        {
          id: neighbor.id,
          name: neighbor.name,
          openingUsd: neighbor.openingUsd,
        },
      ];
    },
  );
  return {
    panelId: (panel?.id ?? panelId) as Panel["id"],
    panelName: panel?.name ?? panelName(panelId),
    neighbors,
  };
}

export function comboLotCopyIsSafe(): boolean {
  const lower = COMBO_LOT_LEAD.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !COMBO_LOT_LEAD.includes("CLOSE_AT") &&
    !COMBO_LOT_LEAD.includes("South Carolina home loop") &&
    !COMBO_LOT_LEAD.includes("Florida panhandle") &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(COMBO_LOT_LEAD) &&
    !/\bbounty\b/i.test(COMBO_LOT_LEAD) &&
    lower.includes("no combo price")
  );
}

export function comboLotInventedPrice(blob: string): boolean {
  const lower = blob.toLowerCase();
  if (/(?<!\bno\s)combo\s*(price|total|package|deal)/i.test(blob)) return true;
  if (/joint\s*bid/i.test(lower) && !/not a joint bid/i.test(lower)) return true;
  if (/\$\s*\d[\d,]*\s*\+\s*\$\s*\d/i.test(blob)) return true;
  if (/bundle\s*for\s*\$/i.test(lower)) return true;
  return false;
}
