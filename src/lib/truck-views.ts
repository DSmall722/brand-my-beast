/**
 * Driver / passenger / front / rear truck views + SVG hotspot seats.
 * Numbered JPEGs stay the base. Interactive lime outlines sit on the steel.
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

/** Matches the 1280×720 board JPEGs. SVG overlays use the same box. */
export const TRUCK_VIEW_BOX = { w: 1280, h: 720 } as const;

export type TruckHotspot = {
  panelId: Panel["id"];
  /** SVG polygon points in TRUCK_VIEW_BOX. */
  points: string;
};

export type PctPoint = readonly [number, number];

export const TRUCK_VIEWS_LEAD = `Driver, passenger, front, and rear of the same stainless preview. Open seats stay unmarked. Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}. Nothing is charged.`;

/** Percent of the JPEG → viewBox points. */
export function pctPoints(pts: readonly PctPoint[]): string {
  const r = (n: number) => Number(n.toFixed(1));
  return pts
    .map(([x, y]) => {
      const px = r(Math.max(0, Math.min(100, x)) * (TRUCK_VIEW_BOX.w / 100));
      const py = r(Math.max(0, Math.min(100, y)) * (TRUCK_VIEW_BOX.h / 100));
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
      const x = Number(xRaw);
      const y = Number(yRaw);
      return {
        x: (x / TRUCK_VIEW_BOX.w) * 100,
        y: (y / TRUCK_VIEW_BOX.h) * 100,
      };
    });
}

/**
 * Door packages stay on cab steel leaves only — no front fender, no glass.
 * Percents of the matching still.
 */
export const DRIVER_DOOR_BOUNDS_PCT = {
  x0: 33,
  x1: 67,
  y0: 36,
  y1: 59,
} as const;

export const PASSENGER_DOOR_BOUNDS_PCT = {
  x0: 22,
  x1: 55,
  y0: 32,
  y1: 59,
} as const;

/** Driver: closed-door profile. Nose left, tail right. Seat 4 is both leaves. */
const DRIVER_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "driver-bed",
    points: pctPoints([
      [65.6, 32.2],
      [74.8, 32.2],
      [74.8, 57.6],
      [65.6, 57.6],
    ]),
  },
  {
    panelId: "driver-rear-quarter",
    points: pctPoints([
      [74.8, 32.2],
      [87.2, 32.2],
      [87.2, 47],
      [85, 47],
      [83.5, 57.6],
      [76.5, 57.6],
      [75, 47],
    ]),
  },
  {
    panelId: "driver-door",
    points: pctPoints([
      [33.8, 37.2],
      [65.6, 37.2],
      [65.6, 57.6],
      [33.8, 57.6],
    ]),
  },
  {
    panelId: "hood",
    points: pctPoints([
      [11, 37.5],
      [35.5, 23.5],
      [36.5, 31],
      [16, 41],
    ]),
  },
  {
    panelId: "front-fascia",
    points: pctPoints([
      [8.8, 39],
      [13.5, 41],
      [13.2, 53.5],
      [8.2, 54.5],
    ]),
  },
  {
    panelId: "front-bumper",
    points: pctPoints([
      [7.8, 54.5],
      [13.2, 53.5],
      [13.5, 61.5],
      [8.2, 61.5],
    ]),
  },
  {
    panelId: "tailgate",
    points: pctPoints([
      [87.2, 32.2],
      [93.8, 33.5],
      [93.8, 51],
      [87.2, 51],
    ]),
  },
  {
    panelId: "rear-bumper",
    points: pctPoints([
      [88.5, 51],
      [95.8, 54],
      [95.8, 61.5],
      [88.5, 61.5],
    ]),
  },
];

/** Passenger: ¾, nose right. Seat 7 is both leaves. */
const PASSENGER_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "passenger-bed",
    points: pctPoints([
      [13.2, 27],
      [23.5, 27],
      [23.5, 57.2],
      [13.2, 57.2],
    ]),
  },
  {
    panelId: "passenger-rear-quarter",
    points: pctPoints([
      [2.2, 26.5],
      [13.2, 26.5],
      [13.2, 48],
      [10, 48],
      [7.5, 57],
      [2.4, 50],
    ]),
  },
  {
    panelId: "passenger-door",
    points: pctPoints([
      [23.5, 33.8],
      [53.5, 33.8],
      [53.5, 57.2],
      [23.5, 57.2],
    ]),
  },
  {
    panelId: "hood",
    points: pctPoints([
      [48, 20],
      [72, 15.5],
      [86, 36],
      [68, 40],
      [52, 30],
    ]),
  },
  {
    panelId: "front-fascia",
    points: pctPoints([
      [85.5, 38],
      [97.2, 42],
      [97.5, 55],
      [86, 54],
    ]),
  },
  {
    panelId: "front-bumper",
    points: pctPoints([
      [86, 55],
      [98, 56],
      [98.2, 66],
      [88, 66.5],
    ]),
  },
];

/** Front: head-on. Stainless face (2) sits above plastic bumper (3). */
const FRONT_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "hood",
    points: pctPoints([
      [21, 22.5],
      [79, 22.5],
      [81.5, 35],
      [18.5, 35],
    ]),
  },
  {
    panelId: "front-fascia",
    points: pctPoints([
      [18.5, 36],
      [81.5, 36],
      [85, 57.5],
      [15, 57.5],
    ]),
  },
  {
    panelId: "front-bumper",
    points: pctPoints([
      [15, 58],
      [85, 58],
      [88, 76],
      [80, 85.5],
      [20, 85.5],
      [12, 76],
    ]),
  },
];

/** Rear: passenger-rear ¾. Tail left, passenger side right. */
const REAR_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "tailgate",
    points: pctPoints([
      [7.5, 20],
      [30.2, 20],
      [30.2, 48],
      [7.5, 48],
    ]),
  },
  {
    panelId: "rear-bumper",
    points: pctPoints([
      [6.8, 48.5],
      [30.2, 48.5],
      [30.2, 62],
      [6.5, 62],
    ]),
  },
  {
    panelId: "passenger-rear-quarter",
    points: pctPoints([
      [30.2, 20],
      [41.5, 20],
      [44, 34],
      [40.5, 48],
      [30.2, 48],
    ]),
  },
  {
    panelId: "passenger-bed",
    points: pctPoints([
      [41.5, 20.5],
      [54, 22],
      [56, 36],
      [50, 48],
      [44, 48],
      [41.5, 34],
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
  return (
    TRUCK_VIEWS.length === 4 &&
    hotspotPanelIds().length === PANELS.length &&
    doorPackagesAreCabLeaves()
  );
}
