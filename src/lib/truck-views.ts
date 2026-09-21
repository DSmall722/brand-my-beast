/**
 * Driver / passenger / front / rear truck views + SVG hotspot seats.
 * Unmarked Pexels stills. Lime overlays + `(N) Name` labels live in the DOM.
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

/** Percent box — overlays sit 1:1 on the 16:9 still. */
export const TRUCK_VIEW_BOX = { w: 100, h: 100 } as const;

export type TruckHotspot = {
  panelId: Panel["id"];
  /** SVG polygon points in a 100×100 viewBox (percents of the JPEG). */
  points: string;
};

export type PctPoint = readonly [number, number];

export const TRUCK_VIEWS_LEAD = `Driver, passenger, front, and rear of the same stainless preview. Open seats stay unmarked. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. Nothing is charged.`;

export function pctPoints(pts: readonly PctPoint[]): string {
  const r = (n: number) => Number(n.toFixed(1));
  return pts
    .map(([x, y]) => {
      const px = r(Math.max(0, Math.min(100, x)));
      const py = r(Math.max(0, Math.min(100, y)));
      return `${px},${py}`;
    })
    .join(" ");
}

export function hotspotPointsPct(points: string): { x: number; y: number }[] {
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [xRaw, yRaw] = pair.split(",");
      return { x: Number(xRaw), y: Number(yRaw) };
    });
}

export function hotspotCentroid(points: string): { x: number; y: number } {
  const pts = hotspotPointsPct(points);
  if (pts.length === 0) return { x: 50, y: 50 };
  const x = pts.reduce((sum, pt) => sum + pt.x, 0) / pts.length;
  const y = pts.reduce((sum, pt) => sum + pt.y, 0) / pts.length;
  return { x, y };
}

const OWNER_VIEW = {
  hood: "front",
  "front-fascia": "front",
  "front-bumper": "front",
  "driver-door": "driver",
  "driver-bed": "driver",
  "driver-rear-quarter": "driver",
  "passenger-door": "passenger",
  "passenger-bed": "passenger",
  "passenger-rear-quarter": "passenger",
  tailgate: "rear",
  "rear-bumper": "rear",
} as const satisfies Record<string, TruckViewId>;

/** Camera that owns the seat on `/panels/[id]`. */
export function viewOwningPanel(panelId: string): TruckViewId {
  if (!(panelId in OWNER_VIEW)) {
    throw new Error(`truck-views: no owning camera for ${panelId}`);
  }
  return OWNER_VIEW[panelId as keyof typeof OWNER_VIEW];
}

/** Door packages stay on cab steel leaves only — no front fender, no glass. */
export const DRIVER_DOOR_BOUNDS_PCT = {
  x0: 36,
  x1: 58,
  y0: 30,
  y1: 58,
} as const;

export const PASSENGER_DOOR_BOUNDS_PCT = {
  x0: 30,
  x1: 60,
  y0: 28,
  y1: 60,
} as const;

/**
 * One camera = only that face’s seats. Do not draw front/rear (or the
 * opposite side) on a flank still just because steel is visible in the photo.
 */
export const VIEW_OWNED_PANEL_IDS = {
  front: ["hood", "front-fascia", "front-bumper"],
  driver: ["driver-door", "driver-rear-quarter", "driver-bed"],
  passenger: ["passenger-door", "passenger-rear-quarter", "passenger-bed"],
  rear: ["tailgate", "rear-bumper"],
} as const satisfies Record<TruckViewId, readonly Panel["id"][]>;

/** Driver profile: nose left. Seats 4–6 only. Seat 4 is both cab leaves. */
const DRIVER_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "driver-door",
    points: pctPoints([
      [37, 32],
      [57, 32],
      [57, 56],
      [37, 56],
    ]),
  },
  {
    panelId: "driver-rear-quarter",
    points: pctPoints([
      [69, 28],
      [82, 28],
      [82, 46],
      [76, 56],
      [69, 56],
    ]),
  },
  {
    panelId: "driver-bed",
    points: pctPoints([
      [57, 30],
      [69, 30],
      [69, 56],
      [57, 56],
    ]),
  },
];

/** Passenger flank: seats 7–9 only. Seat 7 is both cab leaves. */
const PASSENGER_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "passenger-door",
    points: pctPoints([
      [32, 30],
      [58, 30],
      [58, 58],
      [32, 58],
    ]),
  },
  {
    panelId: "passenger-rear-quarter",
    points: pctPoints([
      [3, 25],
      [12, 25],
      [12, 48],
      [8, 58],
      [3, 50],
    ]),
  },
  {
    panelId: "passenger-bed",
    points: pctPoints([
      [12, 26],
      [32, 26],
      [32, 58],
      [12, 58],
    ]),
  },
];

/** Front: head-on. Stainless face (2) sits above plastic bumper (3). */
const FRONT_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "hood",
    points: pctPoints([
      [22, 6],
      [78, 6],
      [83, 36.5],
      [17, 36.5],
    ]),
  },
  {
    panelId: "front-fascia",
    points: pctPoints([
      [16, 37],
      [84, 37],
      [86, 58],
      [14, 58],
    ]),
  },
  {
    panelId: "front-bumper",
    points: pctPoints([
      [14, 58.5],
      [86, 58.5],
      [90, 76],
      [82, 86],
      [18, 86],
      [10, 76],
    ]),
  },
];

/** Rear: Stephen Leonardi forest-road still. Seats 10 + 11 only. */
const REAR_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "tailgate",
    points: pctPoints([
      [42, 36],
      [93, 36],
      [94, 66],
      [42, 66],
    ]),
  },
  {
    panelId: "rear-bumper",
    points: pctPoints([
      [40, 66],
      [95, 66],
      [96, 78],
      [88, 84],
      [44, 84],
      [38, 78],
    ]),
  },
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

function pointsInsideBounds(
  points: string,
  bounds: { x0: number; x1: number; y0: number; y1: number },
): boolean {
  const pts = hotspotPointsPct(points);
  if (pts.length < 3) return false;
  return pts.every(
    (pt) =>
      pt.x >= bounds.x0 &&
      pt.x <= bounds.x1 &&
      pt.y >= bounds.y0 &&
      pt.y <= bounds.y1,
  );
}

/** Door packages stay on cab leaves — no fender, no above-window glass. */
export function doorPackagesAreCabLeaves(): boolean {
  const driver = DRIVER_HOTSPOTS.find((spot) => spot.panelId === "driver-door");
  const passenger = PASSENGER_HOTSPOTS.find(
    (spot) => spot.panelId === "passenger-door",
  );
  if (!driver || !passenger) return false;
  return (
    pointsInsideBounds(driver.points, DRIVER_DOOR_BOUNDS_PCT) &&
    pointsInsideBounds(passenger.points, PASSENGER_DOOR_BOUNDS_PCT)
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
  for (const view of TRUCK_VIEWS) {
    const ids = HOTSPOTS_BY_VIEW[view.id].map((spot) => spot.panelId);
    if (ids.join(",") !== VIEW_OWNED_PANEL_IDS[view.id].join(",")) {
      return false;
    }
  }
  return (
    TRUCK_VIEWS.length === 4 &&
    hotspotPanelIds().length === PANELS.length &&
    doorPackagesAreCabLeaves()
  );
}
