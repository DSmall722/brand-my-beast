/**
 * Eleven-panel training overlays. SVG carries labels — stills stay undotted.
 * Floor $58,000. Buyout $120,000. No lease. Public strings only.
 */

import { FLOOR_USD, GOAL_USD, formatUsd, type Panel } from "./campaign";
import { panelBoardMarkFor, panelFaceCropFor } from "./panel-board";
import type { TruckViewId } from "./truck-views";

export const TRAINING_VIEWBOX = { width: 1600, height: 900 } as const;

export type TrainingLabel = {
  readonly n: number;
  readonly name: string;
  readonly teach: string;
};

const TRAINING_SHORT_NAME: Readonly<Record<Panel["id"], string>> = {
  hood: "Hood",
  "front-fascia": "Front fascia",
  "front-bumper": "Front bumper",
  "driver-door": "Driver doors",
  "driver-rear-quarter": "Driver sail",
  "driver-bed": "Driver bed",
  "passenger-door": "Passenger doors",
  "passenger-rear-quarter": "Passenger sail",
  "passenger-bed": "Passenger bed",
  tailgate: "Tailgate",
  "rear-bumper": "Rear bumper",
};

const TRAINING_TEACH: Readonly<Record<Panel["id"], string>> = {
  hood: "flat-top stainless that opens",
  "front-fascia": "large stainless face — not plastic",
  "front-bumper": "plastic lower bumper — wrap-only",
  "driver-door": "cab leaves, driver side",
  "driver-rear-quarter": "driver sail steel",
  "driver-bed": "driver bed wall",
  "passenger-door": "cab leaves, passenger side",
  "passenger-rear-quarter": "passenger sail steel",
  "passenger-bed": "passenger bed wall",
  tailgate: "rear stainless gate",
  "rear-bumper": "plastic rear bumper — wrap-only",
};

export function trainingLabelFor(panelId: Panel["id"]): TrainingLabel {
  const mark = panelBoardMarkFor(panelId);
  return {
    n: mark.n,
    name: TRAINING_SHORT_NAME[panelId],
    teach: TRAINING_TEACH[panelId],
  };
}

export function trainingRestCaption(label: TrainingLabel): string {
  return `(${label.n}) ${label.name} — ${label.teach}`;
}

export function trainingActiveCaption(label: TrainingLabel): string {
  return `${label.name} — ${label.teach}`;
}

/** Camera that owns the seat still. Hero crops are not a board view. */
export function seatOwningView(panelId: Panel["id"]): TruckViewId {
  const still = panelFaceCropFor(panelId).still;
  switch (still) {
    case "front":
    case "driver":
    case "passenger":
    case "rear":
      return still;
    case "hero":
      return "front";
    default: {
      const _never: never = still;
      return _never;
    }
  }
}

export function scaleHotspotPointsToTraining(points: string): string {
  return points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return `${((x / 400) * TRAINING_VIEWBOX.width).toFixed(1)},${(
        (y / 160) *
        TRAINING_VIEWBOX.height
      ).toFixed(1)}`;
    })
    .join(" ");
}

export function hotspotCenterInTraining(points: string): {
  x: number;
  y: number;
} {
  const pairs = points
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });
  const x = pairs.reduce((sum, row) => sum + row.x, 0) / pairs.length;
  const y = pairs.reduce((sum, row) => sum + row.y, 0) / pairs.length;
  return {
    x: (x / 400) * TRAINING_VIEWBOX.width,
    y: (y / 160) * TRAINING_VIEWBOX.height,
  };
}

export function trainingCopyIsSafe(): boolean {
  const blob = Object.values(TRAINING_TEACH).join(" ");
  const names = Object.values(TRAINING_SHORT_NAME).join(" ");
  const lower = `${blob} ${names}`.toLowerCase();
  return (
    !/\blease\b/.test(lower) &&
    !lower.includes("gmail") &&
    !blob.includes("CLOSE_AT") &&
    !lower.includes("features.md") &&
    formatUsd(FLOOR_USD) === "$58,000" &&
    formatUsd(GOAL_USD) === "$120,000"
  );
}
