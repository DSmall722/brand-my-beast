/**
 * Slice 14.0 — numbered stainless board marks.
 * Numbers match PANELS order (1 hood … 11 rear bumper). Positions are
 * percent of the photo well (hero still / truck-view stage).
 */

import { PANELS, type Panel } from "./campaign";
import {
  parseObjectPosition,
  truckStillSrc,
  type PanelFaceCrop,
  type TruckStillId,
} from "./truck-stills";
import type { TruckViewId } from "./truck-views";

export type BoardPct = { readonly x: number; readonly y: number };

export type PanelBoardMark = {
  readonly n: number;
  readonly panelId: Panel["id"];
  readonly name: string;
  /** Callout on `/hero-truck-preview.jpg` in the homepage hero. */
  readonly hero: BoardPct;
  /** Slice 20.11 — mobile hero positions sit on the body, not cab glass. */
  readonly heroMobile: BoardPct;
  /** Callouts on driver / passenger / front / rear stages (subset per view). */
  readonly views: Readonly<Partial<Record<TruckViewId, BoardPct>>>;
  /** Distinct crop for the homepage panel card / seat mockup. */
  readonly face: PanelFaceCrop;
};

type BoardLayout = {
  hero: BoardPct;
  heroMobile: BoardPct;
  views: Partial<Record<TruckViewId, BoardPct>>;
  face: PanelFaceCrop;
};

/** Mobile Y at or below this stays off the cab glass on the cropped still. */
export const HERO_MOBILE_CAB_GLASS_MAX_Y = 48;

/**
 * Percents of the still. Hero well is 16:9 fill. Board views use
 * object-fit: contain. Each camera JPEG’s width and height set the well so these map 1:1.
 * Driver = seats 4–6 only. Passenger = seats 7–9 only.
 * Front = seats 1–3. Rear = seats 10–11. No bleed across cameras.
 * Door seats 4 and 7 are packages (front + rear cab leaf on that side).
 */
const BOARD_LAYOUT: Record<Panel["id"], BoardLayout> = {
  hood: {
    hero: { x: 24, y: 34 },
    heroMobile: { x: 24, y: 52 },
    views: {
      front: { x: 50, y: 31 },
    },
    face: { still: "front", objectPosition: "50% 26%" },
  },
  "front-fascia": {
    hero: { x: 12, y: 48 },
    heroMobile: { x: 12, y: 62 },
    views: {
      front: { x: 50, y: 48 },
    },
    face: { still: "front", objectPosition: "50% 48%" },
  },
  "driver-door": {
    hero: { x: 34, y: 42 },
    heroMobile: { x: 34, y: 54 },
    views: { driver: { x: 38, y: 52 } },
    face: {
      still: "driver",
      objectPosition: "39% 56%",
      backgroundSize: "320% auto",
    },
  },
  "passenger-door": {
    hero: { x: 31, y: 22 },
    heroMobile: { x: 28, y: 50 },
    views: { passenger: { x: 39, y: 58 } },
    face: {
      still: "passenger",
      objectPosition: "43% 52%",
      backgroundSize: "320% auto",
    },
  },
  "driver-bed": {
    hero: { x: 54, y: 42 },
    heroMobile: { x: 54, y: 54 },
    views: { driver: { x: 82, y: 52 } },
    face: {
      still: "driver",
      objectPosition: "14% 55%",
      backgroundSize: "400% auto",
    },
  },
  "passenger-bed": {
    hero: { x: 56, y: 27 },
    heroMobile: { x: 56, y: 50 },
    views: { passenger: { x: 20, y: 55 } },
    face: {
      still: "passenger",
      objectPosition: "73% 52%",
      backgroundSize: "340% auto",
    },
  },
  "driver-rear-quarter": {
    hero: { x: 73, y: 43 },
    heroMobile: { x: 73, y: 56 },
    views: { driver: { x: 68, y: 39 } },
    face: {
      still: "driver",
      objectPosition: "16% 36%",
      backgroundSize: "480% auto",
    },
  },
  "passenger-rear-quarter": {
    hero: { x: 76, y: 27 },
    heroMobile: { x: 76, y: 52 },
    views: { passenger: { x: 18, y: 42 } },
    face: {
      still: "passenger",
      objectPosition: "73% 38%",
      backgroundSize: "360% auto",
    },
  },
  tailgate: {
    hero: { x: 91, y: 32 },
    heroMobile: { x: 90, y: 54 },
    views: { rear: { x: 65, y: 52 } },
    face: { still: "rear", objectPosition: "68% 52%" },
  },
  "front-bumper": {
    hero: { x: 10, y: 62 },
    heroMobile: { x: 10, y: 72 },
    views: {
      front: { x: 50, y: 69 },
    },
    face: { still: "front", objectPosition: "50% 82%" },
  },
  "rear-bumper": {
    hero: { x: 94, y: 58 },
    heroMobile: { x: 92, y: 68 },
    views: { rear: { x: 64, y: 68.5 } },
    face: { still: "rear", objectPosition: "68% 74%" },
  },
};

/**
 * One mark per panel. Hero layout stays complete; public hero does not
 * paint numbers. Each truck view lists only the seats that camera owns.
 */
export const PANEL_BOARD_MARKS: readonly PanelBoardMark[] = PANELS.map(
  (panel, index) => {
    const layout = BOARD_LAYOUT[panel.id];
    if (!layout) {
      throw new Error(`panel-board: missing layout for ${panel.id}`);
    }
    return {
      n: index + 1,
      panelId: panel.id,
      name: panel.name,
      hero: layout.hero,
      heroMobile: layout.heroMobile,
      views: layout.views,
      face: layout.face,
    };
  },
);

export function panelBoardMarksForView(
  view: TruckViewId,
): readonly PanelBoardMark[] {
  return PANEL_BOARD_MARKS.filter((mark) => mark.views[view] != null);
}

/** Mark for a panel id. Numbers match board callouts (1 hood … 11 rear bumper). */
export function panelBoardMarkFor(panelId: string): PanelBoardMark {
  const mark = PANEL_BOARD_MARKS.find((row) => row.panelId === panelId);
  if (!mark) {
    throw new Error(`panel-board: missing mark for ${panelId}`);
  }
  return mark;
}

export function panelFaceCropFor(panelId: string): PanelFaceCrop {
  return panelBoardMarkFor(panelId).face;
}

export function panelFaceStillSrc(panelId: string): string {
  return truckStillSrc(panelFaceCropFor(panelId).still);
}

export function panelFaceStyle(panelId: string): {
  ["--panel-face-image"]: string;
  ["--panel-face-pos"]: string;
  ["--panel-face-size"]: string;
} {
  const crop = panelFaceCropFor(panelId);
  return {
    ["--panel-face-image"]: `url("${truckStillSrc(crop.still)}")`,
    ["--panel-face-pos"]: crop.objectPosition,
    ["--panel-face-size"]: crop.backgroundSize ?? "cover",
  };
}

/** Slice 16.2 — seat page H1: `4 · Driver doors`. */
export function panelSeatH1(panel: Pick<Panel, "id" | "name">): string {
  const mark = panelBoardMarkFor(panel.id);
  return `${mark.n} · ${panel.name}`;
}

/** Slice 16.3 — legend item: `1 Hood` (number + PANELS name, no extra copy). */
export function panelLegendLabel(mark: Pick<PanelBoardMark, "n" | "name">): string {
  return `${mark.n} ${mark.name}`;
}

/**
 * SVG overlay seat names. Number + name only — no openings, wrap notes,
 * or process copy. Locked shape: `(1) Hood`.
 */
export const PANEL_OVERLAY_NAME = {
  hood: "Hood",
  "front-fascia": "Front Fascia",
  "front-bumper": "Front bumper",
  "driver-door": "Driver Side Doors",
  "driver-rear-quarter": "Driver Rear Sail",
  "driver-bed": "Driver Side Bed",
  "passenger-door": "Passenger Side Doors",
  "passenger-rear-quarter": "Passenger Rear Sail",
  "passenger-bed": "Passenger Side Bed",
  tailgate: "Tailgate",
  "rear-bumper": "Rear bumper",
} as const;

export function panelOverlayName(panelId: string): string {
  if (!(panelId in PANEL_OVERLAY_NAME)) {
    throw new Error(`panel-board: missing overlay name for ${panelId}`);
  }
  return PANEL_OVERLAY_NAME[panelId as keyof typeof PANEL_OVERLAY_NAME];
}

/** Locked overlay label: `(1) Hood`. */
export function panelOverlayLabel(
  mark: Pick<PanelBoardMark, "n" | "panelId">,
): string {
  return `(${mark.n}) ${panelOverlayName(mark.panelId)}`;
}

const OVERLAY_LABEL_RE = /^\(\d+\) [A-Za-z][A-Za-z ]*$/;

const OVERLAY_LABEL_BANNED =
  /\$|opening|wrap-only|wrap only|etch|intent|buyout|floor|cta|click|deposit|stainless compositor|dirty|clean pair|dimension|inch|mm\b/i;

/** Every overlay label is `(N) Name` and nothing else. */
export function overlayLabelsAreNameOnly(): boolean {
  return PANEL_BOARD_MARKS.every((mark) => {
    const label = panelOverlayLabel(mark);
    return OVERLAY_LABEL_RE.test(label) && !OVERLAY_LABEL_BANNED.test(label);
  });
}

export function panelBoardIsComplete(): boolean {
  if (PANEL_BOARD_MARKS.length !== 11) return false;
  if (PANEL_BOARD_MARKS[0]?.panelId !== "hood") return false;
  if (PANEL_BOARD_MARKS[10]?.panelId !== "rear-bumper") return false;
  for (const mark of PANEL_BOARD_MARKS) {
    if (mark.n < 1 || mark.n > 11) return false;
    if (mark.hero.x < 0 || mark.hero.x > 100) return false;
    if (mark.hero.y < 0 || mark.hero.y > 100) return false;
    if (mark.heroMobile.x < 0 || mark.heroMobile.x > 100) return false;
    if (mark.heroMobile.y < 0 || mark.heroMobile.y > 100) return false;
    if (mark.heroMobile.y <= HERO_MOBILE_CAB_GLASS_MAX_Y) return false;
  }
  return true;
}

const FACE_STILL_FOR_PANEL: Record<string, TruckStillId> = {
  hood: "front",
  "front-fascia": "front",
  "front-bumper": "front",
  "driver-door": "driver",
  "passenger-door": "passenger",
  "driver-bed": "driver",
  "passenger-bed": "passenger",
  "driver-rear-quarter": "driver",
  "passenger-rear-quarter": "passenger",
  tailgate: "rear",
  "rear-bumper": "rear",
};

/** Each card crop is unique and points at the still for that steel. */
export function panelFaceCropsAreDistinct(): boolean {
  const seen = new Set<string>();
  for (const mark of PANEL_BOARD_MARKS) {
    const expected = FACE_STILL_FOR_PANEL[mark.panelId];
    if (expected && mark.face.still !== expected) return false;
    const pos = parseObjectPosition(mark.face.objectPosition);
    if (!pos) return false;
    const key = `${mark.face.still}:${mark.face.objectPosition}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return seen.size === 11;
}

/** object-position hints on the dedicated view stills (already framed). */
export const BOARD_VIEW_OBJECT_POSITION: Record<TruckViewId, string> = {
  driver: "50% 50%",
  passenger: "50% 50%",
  front: "50% 50%",
  rear: "50% 50%",
};
