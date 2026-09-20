/**
 * Side / front / rear truck views + SVG hotspot seats (SLICES 3.7).
 * Old static-prototype pattern. Not a 360. Empty seats stay raw 30X.
 * Preview only — no capture, no clock, no invented truck photos.
 */

import { FLOOR_USD, GOAL_USD, PANELS, formatUsd, type Panel } from "./campaign";

export const TRUCK_VIEWS = [
  { id: "side", label: "Side" },
  { id: "front", label: "Front" },
  { id: "rear", label: "Rear" },
] as const;

export type TruckViewId = (typeof TRUCK_VIEWS)[number]["id"];

export type TruckHotspot = {
  panelId: Panel["id"];
  /** SVG polygon points in a 400×160 viewBox. */
  points: string;
};

export const TRUCK_VIEWS_LEAD = `Side, front, and rear of the same stainless preview. Open seats stay unmarked. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. Nothing is charged.`;

/**
 * Percent box → 400×160 polygon. Matches BOARD_LAYOUT view percents
 * so hidden hit-targets sit on the same steel as the numbered discs.
 */
function pctBox(cx: number, cy: number, w: number, h: number): string {
  const clamp = (n: number, max: number) => Math.max(0, Math.min(max, n));
  const x0 = clamp(((cx - w / 2) / 100) * 400, 400);
  const y0 = clamp(((cy - h / 2) / 100) * 160, 160);
  const x1 = clamp(((cx + w / 2) / 100) * 400, 400);
  const y1 = clamp(((cy + h / 2) / 100) * 160, 160);
  const r = (n: number) => Number(n.toFixed(1));
  return `${r(x0)},${r(y0)} ${r(x1)},${r(y0)} ${r(x1)},${r(y1)} ${r(x0)},${r(y1)}`;
}

/** Side: driver ¾-rear. Nose left, tail right. */
const SIDE_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "front-fascia", points: pctBox(8, 54, 10, 14) },
  { panelId: "hood", points: pctBox(14, 32, 12, 12) },
  { panelId: "driver-door", points: pctBox(32, 50, 16, 22) },
  { panelId: "driver-bed", points: pctBox(52, 50, 18, 20) },
  { panelId: "driver-rear-quarter", points: pctBox(74, 48, 14, 20) },
  { panelId: "tonneau", points: pctBox(62, 28, 20, 10) },
  { panelId: "roof", points: pctBox(38, 22, 18, 10) },
  { panelId: "tailgate", points: pctBox(85, 46, 10, 18) },
  { panelId: "rear-fascia", points: pctBox(90, 62, 10, 14) },
];

/** Front: passenger-front. Driver far-left, passenger near-right. */
const FRONT_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "front-fascia", points: pctBox(40, 74, 30, 14) },
  { panelId: "hood", points: pctBox(46, 40, 32, 22) },
  { panelId: "roof", points: pctBox(52, 18, 22, 10) },
  { panelId: "driver-door", points: pctBox(7, 50, 10, 20) },
  { panelId: "passenger-door", points: pctBox(80, 52, 14, 22) },
];

/** Rear: passenger-rear. Tail left, passenger side right. */
const REAR_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "rear-fascia", points: pctBox(20, 70, 22, 12) },
  { panelId: "tailgate", points: pctBox(20, 42, 20, 18) },
  { panelId: "tonneau", points: pctBox(28, 26, 18, 10) },
  { panelId: "roof", points: pctBox(56, 24, 16, 8) },
  { panelId: "driver-rear-quarter", points: pctBox(7, 50, 10, 20) },
  { panelId: "passenger-rear-quarter", points: pctBox(44, 42, 14, 18) },
  { panelId: "passenger-bed", points: pctBox(60, 44, 16, 18) },
];

const HOTSPOTS_BY_VIEW: Record<TruckViewId, readonly TruckHotspot[]> = {
  side: SIDE_HOTSPOTS,
  front: FRONT_HOTSPOTS,
  rear: REAR_HOTSPOTS,
};

export function isTruckViewId(value: string): value is TruckViewId {
  return TRUCK_VIEWS.some((row) => row.id === value);
}

export function hotspotsForView(view: TruckViewId): readonly TruckHotspot[] {
  return HOTSPOTS_BY_VIEW[view];
}

/** Every panel id that appears as a hotspot in any view. */
export function hotspotPanelIds(): readonly Panel["id"][] {
  const ids = new Set<Panel["id"]>();
  for (const view of TRUCK_VIEWS) {
    for (const spot of HOTSPOTS_BY_VIEW[view.id]) {
      ids.add(spot.panelId);
    }
  }
  return [...ids];
}

/** Slice 17.2 — floor + buyout, no lease, no CLOSE_AT. Hotspot jargon is not required. */
export function truckViewsLeadIsSafe(lead: string): boolean {
  const lower = lead.toLowerCase();
  return (
    lead.includes(formatUsd(FLOOR_USD)) &&
    lead.includes(formatUsd(GOAL_USD)) &&
    !lower.includes("prototype") &&
    !lower.includes("hotspot") &&
    !lower.includes("30x") &&
    !/\blease\b/.test(lower) &&
    !lead.includes("CLOSE_AT") &&
    !lead.includes("South Carolina home loop") &&
    !lead.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\blivestream\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(lead)
  );
}

export function truckViewsCopyIsSafe(): boolean {
  return truckViewsLeadIsSafe(TRUCK_VIEWS_LEAD);
}

/** Hotspots must point at real campaign panels only. */
export function truckHotspotsAreValid(): boolean {
  const known = new Set(PANELS.map((panel) => panel.id));
  for (const view of TRUCK_VIEWS) {
    for (const spot of HOTSPOTS_BY_VIEW[view.id]) {
      if (!known.has(spot.panelId)) return false;
      if (!spot.points.trim()) return false;
    }
  }
  return TRUCK_VIEWS.length === 3;
}
