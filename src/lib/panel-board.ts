/**
 * Slice 14.0 — numbered stainless board marks.
 * Numbers match PANELS order (1 hood … 12 rear fascia). Positions are
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
  /** Callouts on side / front / rear photo stages (subset per view). */
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
 * object-fit: contain on a photo well so these map 1:1 to the JPEG.
 * Side = driver ¾-rear. Front = passenger-front (passenger near-right).
 * Rear = passenger-rear (tail left, passenger side right).
 */
const BOARD_LAYOUT: Record<Panel["id"], BoardLayout> = {
  hood: {
    hero: { x: 24, y: 34 },
    heroMobile: { x: 24, y: 52 },
    views: { side: { x: 17, y: 29 }, front: { x: 40, y: 38 } },
    face: { still: "front", objectPosition: "46% 30%" },
  },
  "front-fascia": {
    hero: { x: 11, y: 52 },
    heroMobile: { x: 11, y: 66 },
    views: { side: { x: 14, y: 58 }, front: { x: 36, y: 76 } },
    face: { still: "front", objectPosition: "42% 82%" },
  },
  "driver-door": {
    hero: { x: 34, y: 42 },
    heroMobile: { x: 34, y: 54 },
    views: { side: { x: 32, y: 48 }, front: { x: 10, y: 36 } },
    face: { still: "side", objectPosition: "30% 48%" },
  },
  "passenger-door": {
    hero: { x: 31, y: 22 },
    heroMobile: { x: 28, y: 50 },
    views: { front: { x: 76, y: 46 } },
    face: { still: "front", objectPosition: "80% 48%" },
  },
  "driver-bed": {
    hero: { x: 54, y: 42 },
    heroMobile: { x: 54, y: 54 },
    views: { side: { x: 47, y: 44 } },
    face: { still: "side", objectPosition: "58% 48%" },
  },
  "passenger-bed": {
    hero: { x: 56, y: 27 },
    heroMobile: { x: 56, y: 50 },
    views: { rear: { x: 50, y: 40 } },
    face: { still: "rear", objectPosition: "64% 42%" },
  },
  "driver-rear-quarter": {
    hero: { x: 73, y: 43 },
    heroMobile: { x: 73, y: 56 },
    views: { side: { x: 74, y: 46 }, rear: { x: 5, y: 36 } },
    face: { still: "side", objectPosition: "76% 46%" },
  },
  "passenger-rear-quarter": {
    hero: { x: 76, y: 27 },
    heroMobile: { x: 76, y: 52 },
    views: { rear: { x: 40, y: 40 } },
    face: { still: "rear", objectPosition: "48% 46%" },
  },
  tailgate: {
    hero: { x: 91, y: 32 },
    heroMobile: { x: 90, y: 54 },
    views: { side: { x: 86, y: 44 }, rear: { x: 22, y: 42 } },
    face: { still: "rear", objectPosition: "24% 38%" },
  },
  tonneau: {
    hero: { x: 64, y: 24 },
    heroMobile: { x: 64, y: 50 },
    views: { side: { x: 58, y: 22 }, rear: { x: 24, y: 19 } },
    face: { still: "rear", objectPosition: "34% 16%" },
  },
  roof: {
    hero: { x: 40, y: 19 },
    heroMobile: { x: 40, y: 50 },
    views: {
      side: { x: 34, y: 18 },
      front: { x: 48, y: 12 },
      rear: { x: 58, y: 15 },
    },
    face: { still: "side", objectPosition: "40% 16%" },
  },
  "rear-fascia": {
    hero: { x: 94, y: 58 },
    heroMobile: { x: 92, y: 68 },
    views: { side: { x: 90, y: 64 }, rear: { x: 22, y: 70 } },
    face: { still: "rear", objectPosition: "22% 76%" },
  },
};

/**
 * One mark per panel. Hero shows all twelve. Each truck view shows the
 * faces that read on that angle of the matching still.
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

/** Mark for a panel id. Numbers match hero callouts (1 hood … 12 rear fascia). */
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
} {
  const crop = panelFaceCropFor(panelId);
  return {
    ["--panel-face-image"]: `url("${truckStillSrc(crop.still)}")`,
    ["--panel-face-pos"]: crop.objectPosition,
  };
}

/** Slice 16.2 — seat page H1: `3 · Driver door`. */
export function panelSeatH1(panel: Pick<Panel, "id" | "name">): string {
  const mark = panelBoardMarkFor(panel.id);
  return `${mark.n} · ${panel.name}`;
}

/** Slice 16.3 — legend item: `1 Hood` (number + PANELS name, no extra copy). */
export function panelLegendLabel(mark: Pick<PanelBoardMark, "n" | "name">): string {
  return `${mark.n} ${mark.name}`;
}

export function panelBoardIsComplete(): boolean {
  if (PANEL_BOARD_MARKS.length !== 12) return false;
  if (PANEL_BOARD_MARKS[0]?.panelId !== "hood") return false;
  if (PANEL_BOARD_MARKS[11]?.panelId !== "rear-fascia") return false;
  for (const mark of PANEL_BOARD_MARKS) {
    if (mark.n < 1 || mark.n > 12) return false;
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
  "driver-door": "side",
  "passenger-door": "front",
  "driver-bed": "side",
  "passenger-bed": "rear",
  "driver-rear-quarter": "side",
  "passenger-rear-quarter": "rear",
  tailgate: "rear",
  tonneau: "rear",
  roof: "side",
  "rear-fascia": "rear",
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
  return seen.size === 12;
}

/** object-position hints on the dedicated view stills (already framed). */
export const BOARD_VIEW_OBJECT_POSITION: Record<TruckViewId, string> = {
  side: "50% 50%",
  front: "50% 48%",
  rear: "50% 50%",
};
