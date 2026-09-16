import { CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

/**
 * Slice 12.23 — shop cut-file checklist items.
 * Partner-shop form only. Never a homepage card. Local prep; no capture.
 */

export type ShopCutFileChecklistItem = {
  id:
    | "vector"
    | "no-raster"
    | "panel-label"
    | "approval-before-cut"
    | "etch-gate";
  label: string;
};

export const SHOP_CUT_FILE_CHECKLIST: readonly ShopCutFileChecklistItem[] = [
  {
    id: "vector",
    label:
      "Full-color shop-ready vector (AI / SVG / PDF) ready for the vinyl cutter.",
  },
  {
    id: "no-raster",
    label: "No low-res screenshot or raster-only art on the cut path.",
  },
  {
    id: "panel-label",
    label: "File named to panel id + brand before it hits the cutter.",
  },
  {
    id: "approval-before-cut",
    label:
      "Approval thread cleared — RULES.md before the vinyl cutter sees a file.",
  },
  {
    id: "etch-gate",
    label: `Etch cut stays locked under ${formatUsd(GOAL_USD)} buyout.`,
  },
] as const;

/** Merge-gate: toggling cut-file boxes must leave CLOSE_AT null. */
export function assertShopCutFileChecklistDoesNotSetCloseAt(
  checkedIds: readonly string[],
): boolean {
  void checkedIds;
  return CLOSE_AT === null;
}

export function shopCutFileChecklistFenceCopy(): string {
  return `Cut-file prep only. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. No card capture. Auction clock stays unset.`;
}
