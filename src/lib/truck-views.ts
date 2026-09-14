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

export const TRUCK_VIEWS_LEAD = `Side / front / rear. SVG hotspots on the board truck — old static prototype pattern. Empty seats stay raw 30X. Not a 360. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. Still no card charge.`;

/** Side silhouette: driver-side panels + shared faces. */
const SIDE_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "front-fascia", points: "18,78 42,62 52,62 52,118 28,118" },
  { panelId: "hood", points: "52,58 118,48 118,78 52,78" },
  { panelId: "driver-door", points: "118,52 168,52 168,118 118,118" },
  { panelId: "driver-bed", points: "168,58 248,58 248,118 168,118" },
  { panelId: "driver-rear-quarter", points: "248,58 292,58 292,118 248,118" },
  { panelId: "tonneau", points: "168,42 292,42 292,58 168,58" },
  { panelId: "roof", points: "78,28 248,28 248,48 118,48 78,42" },
  { panelId: "tailgate", points: "292,52 338,62 338,118 292,118" },
  { panelId: "rear-fascia", points: "338,72 372,84 368,118 338,118" },
];

const FRONT_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "front-fascia", points: "110,96 290,96 300,128 100,128" },
  { panelId: "hood", points: "120,58 280,58 290,96 110,96" },
  { panelId: "roof", points: "140,28 260,28 280,58 120,58" },
  { panelId: "driver-door", points: "78,64 120,58 120,128 86,128" },
  { panelId: "passenger-door", points: "280,58 322,64 314,128 280,128" },
];

const REAR_HOTSPOTS: readonly TruckHotspot[] = [
  { panelId: "rear-fascia", points: "110,104 290,104 300,132 100,132" },
  { panelId: "tailgate", points: "120,58 280,58 290,104 110,104" },
  { panelId: "tonneau", points: "130,36 270,36 280,58 120,58" },
  { panelId: "roof", points: "150,18 250,18 270,36 130,36" },
  {
    panelId: "driver-rear-quarter",
    points: "78,58 120,58 120,132 86,132",
  },
  {
    panelId: "passenger-rear-quarter",
    points: "280,58 322,58 314,132 280,132",
  },
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

export function truckViewsCopyIsSafe(): boolean {
  const lower = TRUCK_VIEWS_LEAD.toLowerCase();
  return (
    lower.includes("hotspot") &&
    lower.includes("raw 30x") &&
    lower.includes("not a 360") &&
    !/\blease\b/.test(lower) &&
    !TRUCK_VIEWS_LEAD.includes("CLOSE_AT") &&
    !TRUCK_VIEWS_LEAD.includes("South Carolina home loop") &&
    !TRUCK_VIEWS_LEAD.includes("Florida panhandle") &&
    !/\bbounty\b/.test(lower) &&
    !/\blivestream\b/.test(lower) &&
    !/\b\d+\s*(impressions|cpm)\b/i.test(TRUCK_VIEWS_LEAD)
  );
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
