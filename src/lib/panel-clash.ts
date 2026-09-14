/**
 * Adjacent-panel clash detector (FEATURES P2 #20).
 * Soft visual-adjacency guidance — no capture, no clock.
 */

import { PANELS, type Panel } from "./campaign";

/** Undirected truck-face neighbors (shared edges / visual adjacency). */
export const PANEL_ADJACENCY: Readonly<
  Record<Panel["id"], readonly Panel["id"][]>
> = {
  hood: ["front-fascia", "roof", "driver-door", "passenger-door"],
  "front-fascia": ["hood", "driver-door", "passenger-door"],
  "driver-door": ["hood", "front-fascia", "driver-bed"],
  "passenger-door": ["hood", "front-fascia", "passenger-bed"],
  "driver-bed": ["driver-door", "driver-rear-quarter", "tonneau"],
  "passenger-bed": ["passenger-door", "passenger-rear-quarter", "tonneau"],
  "driver-rear-quarter": ["driver-bed", "tailgate", "rear-fascia"],
  "passenger-rear-quarter": ["passenger-bed", "tailgate", "rear-fascia"],
  tailgate: [
    "tonneau",
    "rear-fascia",
    "driver-rear-quarter",
    "passenger-rear-quarter",
  ],
  tonneau: ["roof", "driver-bed", "passenger-bed", "tailgate"],
  roof: ["hood", "tonneau"],
  "rear-fascia": ["tailgate", "driver-rear-quarter", "passenger-rear-quarter"],
};

export type AdjacentSeatHolder = {
  panelId: Panel["id"];
  panelName: string;
  brandLabel: string;
  tradeLabel: string;
};

export type AdjacentClash = {
  panelId: Panel["id"];
  panelName: string;
  neighborBrand: string;
  reason: "same-brand" | "brand-overlap";
  message: string;
};

export function normalizeBrandKey(brandLabel: string): string {
  return brandLabel.trim().toLowerCase().replace(/\s+/g, " ");
}

export function adjacentPanelIds(panelId: string): readonly Panel["id"][] {
  return PANEL_ADJACENCY[panelId as Panel["id"]] ?? [];
}

function brandTokens(brand: string): Set<string> {
  return new Set(
    normalizeBrandKey(brand)
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3),
  );
}

function brandsOverlap(a: string, b: string): boolean {
  const keyA = normalizeBrandKey(a);
  const keyB = normalizeBrandKey(b);
  if (!keyA || !keyB) return false;
  if (keyA === keyB) return true;
  if (keyA.includes(keyB) || keyB.includes(keyA)) return true;
  const tokensA = brandTokens(a);
  const tokensB = brandTokens(b);
  for (const t of tokensA) {
    if (tokensB.has(t)) return true;
  }
  return false;
}

export function findAdjacentClashes(input: {
  panelId: string;
  brandLabel: string;
  neighbors: readonly AdjacentSeatHolder[];
}): AdjacentClash[] {
  const brand = input.brandLabel.trim();
  if (!brand) return [];

  const clashes: AdjacentClash[] = [];
  for (const neighbor of input.neighbors) {
    const same = normalizeBrandKey(brand) === normalizeBrandKey(neighbor.brandLabel);
    const overlap = brandsOverlap(brand, neighbor.brandLabel);
    if (!same && !overlap) continue;
    clashes.push({
      panelId: neighbor.panelId,
      panelName: neighbor.panelName,
      neighborBrand: neighbor.brandLabel,
      reason: same ? "same-brand" : "brand-overlap",
      message: same
        ? `Same brand already stands on adjacent ${neighbor.panelName}.`
        : `Brand mark overlaps adjacent ${neighbor.panelName} (${neighbor.brandLabel}).`,
    });
  }
  return clashes;
}

/** Resolve adjacency seats that currently hold listed/approved intents. */
export function holdersOnAdjacentPanels(
  panelId: string,
  holdersByPanel: ReadonlyMap<string, AdjacentSeatHolder | null>,
): AdjacentSeatHolder[] {
  const out: AdjacentSeatHolder[] = [];
  for (const neighborId of adjacentPanelIds(panelId)) {
    const holder = holdersByPanel.get(neighborId);
    if (holder) out.push(holder);
  }
  return out;
}

export function panelName(panelId: string): string {
  return PANELS.find((p) => p.id === panelId)?.name ?? panelId;
}
