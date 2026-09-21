/**
 * Driver / passenger / front / rear truck views + SVG hotspot seats.
 * Homepage board bakes numbers into the JPEGs. Seat pages keep overlays.
 * Preview only — no capture, no clock, no invented truck photos.
 */

import { FLOOR_USD, GOAL_USD, PANELS, formatUsd, type Panel } from "./campaign";

export const TRUCK_VIEWS = [
  { id: "driver", label: "Driver" },
  { id: "passenger", label: "Passenger" },
  { id: "front", label: "Front" },
  { id: "rear", label: "Rear" },
] as const;

export type TruckViewId = (typeof TRUCK_VIEWS)[number]["id"];

export type TruckHotspot = {
  panelId: Panel["id"];
  /** SVG polygon points in a 400×160 viewBox. */
  points: string;
};

export const TRUCK_VIEWS_LEAD = `Driver, passenger, front, and rear of the same stainless preview. Open seats stay unmarked. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. Nothing is charged.`;

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

/** Driver: closed-door profile. Nose left, tail right. Seat 3 is both leaves. */
const DRIVER_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "front-bumper", points: pctBox(10, 58, 10, 12) },
  { panelId: "front-fascia", points: pctBox(12, 50, 12, 14) },
  { panelId: "hood", points: pctBox(22, 38, 12, 12) },
  { panelId: "driver-door", points: pctBox(42, 48, 20, 24) },
  { panelId: "driver-bed", points: pctBox(68, 46, 12, 18) },
  { panelId: "driver-rear-quarter", points: pctBox(80, 46, 10, 18) },
  { panelId: "tailgate", points: pctBox(88, 40, 10, 18) },
  { panelId: "rear-bumper", points: pctBox(92, 58, 10, 12) },
];

/** Passenger: ¾, nose right. Seat 4 is both leaves. */
const PASSENGER_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "front-bumper", points: pctBox(90, 62, 10, 12) },
  { panelId: "front-fascia", points: pctBox(86, 50, 12, 14) },
  { panelId: "hood", points: pctBox(68, 36, 14, 14) },
  { panelId: "passenger-door", points: pctBox(50, 48, 18, 24) },
  { panelId: "passenger-bed", points: pctBox(20, 46, 12, 18) },
  { panelId: "passenger-rear-quarter", points: pctBox(12, 44, 12, 18) },
];

/** Front: head-on. Stainless face (2) sits above plastic bumper (10). */
const FRONT_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "hood", points: pctBox(50, 26, 36, 16) },
  { panelId: "front-fascia", points: pctBox(50, 48, 36, 16) },
  { panelId: "front-bumper", points: pctBox(50, 80, 36, 12) },
];

/** Rear: passenger-rear ¾. Tail left, passenger side right. */
const REAR_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "rear-bumper", points: pctBox(18, 58, 16, 12) },
  { panelId: "tailgate", points: pctBox(18, 42, 16, 18) },
  { panelId: "passenger-rear-quarter", points: pctBox(36, 40, 12, 16) },
  { panelId: "passenger-bed", points: pctBox(46, 42, 14, 16) },
];

const HOTSPOTS_BY_VIEW: Record<TruckViewId, readonly TruckHotspot[]> = {
  driver: DRIVER_HOTSPOTS,
  passenger: PASSENGER_HOTSPOTS,
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

/** Slice 17.2 — floor + buyout, no lease, no CLOSE_AT. */
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
  return TRUCK_VIEWS.length === 4;
}
