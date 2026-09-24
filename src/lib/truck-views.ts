/**
 * Driver / passenger / front / rear truck views + SVG hotspot seats.
 * Front, rear, and driver stills are 2048×1360. Passenger is the
 * 1728×1152 plaza bake. SVG is hit / hover only —
 * `(N) Name` is baked into the JPEG. Preview only — no capture, no
 * clock, no invented truck photos.
 */

import { FLOOR_USD, GOAL_USD, PANELS, formatUsd, type Panel } from "./campaign";

/** QA 1047PM — Preview the Panels tab order: Front → Driver → Passenger → Rear. */
export const TRUCK_VIEWS = [
  { id: "front", label: "Front" },
  { id: "driver", label: "Driver" },
  { id: "passenger", label: "Passenger" },
  { id: "rear", label: "Rear" },
] as const;

export type TruckViewId = (typeof TRUCK_VIEWS)[number]["id"];

/** Percent box — overlays sit 1:1 on each camera’s JPEG. */
export const TRUCK_VIEW_BOX = { w: 100, h: 100 } as const;

export type TruckHotspot = {
  panelId: Panel["id"];
  /** SVG polygon points in a 100×100 viewBox (percents of the JPEG). */
  points: string;
};

/**
 * Visible pill around baked `(N) Name` ink. Percent of the still,
 * already padded. The hotspot polygon stays the invisible hit pad.
 * Stills are 3:2, so a round cap uses rx = ry * 2/3 in this viewBox.
 */
export type NameChip = {
  panelId: Panel["id"];
  x: number;
  y: number;
  w: number;
  h: number;
};

export const NAME_CHIP_RX_PER_RY = 2 / 3;

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
  x0: 28,
  x1: 58,
  y0: 43,
  y1: 66,
} as const;

export const PASSENGER_DOOR_BOUNDS_PCT = {
  x0: 21,
  x1: 54,
  y0: 44,
  y1: 75,
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

/**
 * Driver profile: nose left. Seats 4–6 only.
 * Pre-cropped garage bake at full-side framing (no extra zoom).
 * Doors = both cab leaves under the belt. Sail = wedge on the roof
 * slope. Bed = bedside under that seam, notched over the tire.
 */
const DRIVER_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "driver-door",
    points: pctPoints([
      [29.4, 47.6],
      [35.5, 45.4],
      [56.2, 44.4],
      [56.2, 64.6],
      [29.4, 64.5],
    ]),
  },
  {
    panelId: "driver-rear-quarter",
    points: pctPoints([
      [56.3, 44.4],
      [56.3, 37.2],
      [66.0, 39.4],
      [78.0, 42.2],
      [88.5, 45.2],
      [82.0, 51.0],
      [66.0, 51.0],
    ]),
  },
  {
    panelId: "driver-bed",
    points: pctPoints([
      [56.3, 44.6],
      [66.0, 51.2],
      [82.0, 51.2],
      [88.5, 45.6],
      [90.5, 46.2],
      [90.4, 59.5],
      [79.2, 59.3],
      [76.5, 55.8],
      [65.2, 51.8],
      [61.6, 57.0],
      [60.2, 61.2],
      [56.3, 61.4],
    ]),
  },
];

/**
 * Passenger profile: nose right. Seats 7–9 only.
 * Plaza bake. Doors = both cab leaves under the belt. Sail = wedge on
 * the roof slope. Bed = bedside under that seam, notched over the tire.
 */
const PASSENGER_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "passenger-door",
    points: pctPoints([
      [21.8, 45.4],
      [52.8, 45.8],
      [52.8, 73.6],
      [21.8, 70.0],
    ]),
  },
  {
    panelId: "passenger-rear-quarter",
    points: pctPoints([
      [7.8, 45.4],
      [21.8, 45.4],
      [22.0, 38.8],
    ]),
  },
  {
    panelId: "passenger-bed",
    points: pctPoints([
      [3.2, 47.0],
      [7.8, 45.4],
      [21.8, 45.4],
      [21.8, 70.0],
      [19.8, 68.6],
      [18.2, 64.0],
      [16.6, 56.5],
      [14.2, 53.2],
      [8.4, 53.0],
      [7.0, 58.0],
      [5.8, 61.6],
      [3.2, 61.5],
    ]),
  },
];

/**
 * Front: head-on. Stainless face (2) sits above plastic bumper (3).
 * Thin TRACE AID bands (hood / sail / rear bumper) are padded to ≥19%
 * height so the invisible hit target stays ≥44px on a 390px seat well.
 */
const FRONT_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "hood",
    // ≥19% tall for ≥44px hit on seat wells; shorter than pre-QA face wash.
    points: pctPoints([
      [12, 17],
      [88, 17],
      [88, 36],
      [12, 36],
    ]),
  },
  {
    panelId: "front-fascia",
    points: pctPoints([
      [10, 37],
      [90, 37],
      [90, 54],
      [10, 54],
    ]),
  },
  {
    panelId: "front-bumper",
    // Larger than main’s ~14.5% band — plastic bumper reads as the lower third.
    points: pctPoints([
      [8, 55],
      [91, 55],
      [91, 80],
      [8, 80],
    ]),
  },
];

/** Rear: TRACE AID forest-road still. Seats 10 + 11 only. */
const REAR_HOTSPOTS: readonly TruckHotspot[] = [
  {
    panelId: "tailgate",
    points: pctPoints([
      [44.5, 43.8],
      [85.7, 43.8],
      [85.7, 60.5],
      [44.5, 60.5],
    ]),
  },
  {
    panelId: "rear-bumper",
    points: pctPoints([
      [42.2, 62.5],
      [86, 62.5],
      [84.5, 81.5],
      [44, 81.5],
    ]),
  },
];

const HOTSPOTS_BY_VIEW: Record<TruckViewId, readonly TruckHotspot[]> = {
  driver: DRIVER_HOTSPOTS,
  passenger: PASSENGER_HOTSPOTS,
  front: FRONT_HOTSPOTS,
  rear: REAR_HOTSPOTS,
};

type InkPx = {
  panelId: Panel["id"];
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

type ChipPad = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

/**
 * Pixel pad around baked `(N) Name` ink.
 * 72px on a 2048-wide still is about 12px when the board is 350px wide.
 * Passenger scales to 61px on its 1728-wide still so the visual pad matches.
 * Sail and bed names are 34px apart, so that shared edge stays at 14px.
 */
const NAME_CHIP_PAD_PX = 72;
const PASSENGER_CHIP_PAD_PX = 61;
const PASSENGER_STACK_PAD_PX = 14;

function evenPad(px: number): ChipPad {
  return { left: px, right: px, top: px, bottom: px };
}

function nameChip(
  imgW: number,
  imgH: number,
  ink: InkPx,
  pad: ChipPad,
): NameChip {
  const x0 = ink.x0 - pad.left;
  const y0 = ink.y0 - pad.top;
  const x1 = ink.x1 + pad.right;
  const y1 = ink.y1 + pad.bottom;
  const pct = (n: number, span: number) =>
    Number(((n / span) * 100).toFixed(2));
  return {
    panelId: ink.panelId,
    x: pct(x0, imgW),
    y: pct(y0, imgH),
    w: pct(x1 - x0, imgW),
    h: pct(y1 - y0, imgH),
  };
}

const FRONT_STILL = { w: 2048, h: 1360 } as const;
const PASSENGER_STILL = { w: 1728, h: 1152 } as const;

const NAME_CHIPS: Record<TruckViewId, readonly NameChip[]> = {
  front: [
    { panelId: "hood", x0: 932, y0: 408, x1: 1091, y1: 451 },
    { panelId: "front-fascia", x0: 876, y0: 656, x1: 1165, y1: 700 },
    { panelId: "front-bumper", x0: 860, y0: 900, x1: 1182, y1: 944 },
  ].map((ink) =>
    nameChip(FRONT_STILL.w, FRONT_STILL.h, ink, evenPad(NAME_CHIP_PAD_PX)),
  ),
  driver: [
    { panelId: "driver-door", x0: 738, y0: 726, x1: 1018, y1: 762 },
    { panelId: "driver-rear-quarter", x0: 1209, y0: 568, x1: 1464, y1: 595 },
    { panelId: "driver-bed", x0: 1583, y0: 700, x1: 1815, y1: 735 },
  ].map((ink) =>
    nameChip(FRONT_STILL.w, FRONT_STILL.h, ink, evenPad(NAME_CHIP_PAD_PX)),
  ),
  passenger: [
    nameChip(
      PASSENGER_STILL.w,
      PASSENGER_STILL.h,
      {
        panelId: "passenger-rear-quarter",
        x0: 172,
        y0: 515,
        x1: 370,
        y1: 539,
      },
      {
        left: PASSENGER_CHIP_PAD_PX,
        right: PASSENGER_CHIP_PAD_PX,
        top: PASSENGER_CHIP_PAD_PX,
        bottom: PASSENGER_STACK_PAD_PX,
      },
    ),
    nameChip(
      PASSENGER_STILL.w,
      PASSENGER_STILL.h,
      {
        panelId: "passenger-bed",
        x0: 110,
        y0: 573,
        x1: 311,
        y1: 603,
      },
      {
        left: PASSENGER_CHIP_PAD_PX,
        right: PASSENGER_CHIP_PAD_PX,
        top: PASSENGER_STACK_PAD_PX,
        bottom: PASSENGER_CHIP_PAD_PX,
      },
    ),
    nameChip(
      PASSENGER_STILL.w,
      PASSENGER_STILL.h,
      {
        panelId: "passenger-door",
        x0: 614,
        y0: 653,
        x1: 888,
        y1: 688,
      },
      evenPad(PASSENGER_CHIP_PAD_PX),
    ),
  ],
  rear: [
    { panelId: "tailgate", x0: 1217, y0: 688, x1: 1436, y1: 730 },
    { panelId: "rear-bumper", x0: 1170, y0: 932, x1: 1470, y1: 972 },
  ].map((ink) =>
    nameChip(FRONT_STILL.w, FRONT_STILL.h, ink, evenPad(NAME_CHIP_PAD_PX)),
  ),
};

export function isTruckViewId(value: string): value is TruckViewId {
  return TRUCK_VIEWS.some((row) => row.id === value);
}

export function hotspotsForView(view: TruckViewId): readonly TruckHotspot[] {
  return HOTSPOTS_BY_VIEW[view];
}

export function nameChipsForView(view: TruckViewId): readonly NameChip[] {
  return NAME_CHIPS[view];
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
  for (const view of TRUCK_VIEWS) {
    const chips = NAME_CHIPS[view.id];
    const spots = HOTSPOTS_BY_VIEW[view.id];
    if (chips.length !== spots.length) return false;
    for (const spot of spots) {
      const chip = chips.find((row) => row.panelId === spot.panelId);
      if (!chip) return false;
      if (chip.w < 10 || chip.w > 26 || chip.h < 6 || chip.h > 16) return false;
      if (chip.x < 0 || chip.y < 0) return false;
      if (chip.x + chip.w > 100 || chip.y + chip.h > 100) return false;
    }
  }
  return (
    TRUCK_VIEWS.length === 4 &&
    hotspotPanelIds().length === PANELS.length &&
    doorPackagesAreCabLeaves()
  );
}
