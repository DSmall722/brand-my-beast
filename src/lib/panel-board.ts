/**
 * Slice 14.0 — numbered stainless board marks.
 * Numbers match PANELS order (1 hood … 12 rear fascia). Positions are
 * percent of the photo well (hero still / truck-view stage).
 */

import { PANELS, type Panel } from "./campaign";
import type { TruckViewId } from "./truck-views";

export type BoardPct = { readonly x: number; readonly y: number };

export type PanelBoardMark = {
  readonly n: number;
  readonly panelId: Panel["id"];
  readonly name: string;
  /** Callout on `/hero-truck-preview.jpg` in the homepage hero. */
  readonly hero: BoardPct;
  /** Callouts on side / front / rear photo stages (subset per view). */
  readonly views: Readonly<Partial<Record<TruckViewId, BoardPct>>>;
};

type BoardLayout = {
  hero: BoardPct;
  views: Partial<Record<TruckViewId, BoardPct>>;
};

/** Percents tuned to the front-¾ stainless still in /public. */
const BOARD_LAYOUT: Record<Panel["id"], BoardLayout> = {
  hood: {
    hero: { x: 46, y: 36 },
    views: { side: { x: 38, y: 40 }, front: { x: 50, y: 42 } },
  },
  "front-fascia": {
    hero: { x: 34, y: 52 },
    views: { side: { x: 22, y: 55 }, front: { x: 50, y: 62 } },
  },
  "driver-door": {
    hero: { x: 48, y: 54 },
    views: { side: { x: 48, y: 55 }, front: { x: 28, y: 58 } },
  },
  "passenger-door": {
    hero: { x: 62, y: 48 },
    views: { front: { x: 72, y: 58 } },
  },
  "driver-bed": {
    hero: { x: 60, y: 56 },
    views: { side: { x: 62, y: 58 } },
  },
  "passenger-bed": {
    hero: { x: 72, y: 50 },
    views: { side: { x: 70, y: 52 } },
  },
  "driver-rear-quarter": {
    hero: { x: 70, y: 58 },
    views: { side: { x: 78, y: 58 }, rear: { x: 28, y: 58 } },
  },
  "passenger-rear-quarter": {
    hero: { x: 80, y: 52 },
    views: { rear: { x: 72, y: 58 } },
  },
  tailgate: {
    hero: { x: 84, y: 56 },
    views: { side: { x: 88, y: 55 }, rear: { x: 50, y: 48 } },
  },
  tonneau: {
    hero: { x: 66, y: 42 },
    views: { side: { x: 68, y: 42 }, rear: { x: 50, y: 36 } },
  },
  roof: {
    hero: { x: 52, y: 26 },
    views: {
      side: { x: 48, y: 28 },
      front: { x: 50, y: 28 },
      rear: { x: 50, y: 22 },
    },
  },
  "rear-fascia": {
    hero: { x: 90, y: 62 },
    views: { side: { x: 94, y: 62 }, rear: { x: 50, y: 72 } },
  },
};

/**
 * One mark per panel. Hero shows all twelve. Each truck view shows the
 * faces that read on that angle of the shared stainless still.
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
      views: layout.views,
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

/** Slice 16.2 — seat page H1: `3 · Driver door`. */
export function panelSeatH1(panel: Pick<Panel, "id" | "name">): string {
  const mark = panelBoardMarkFor(panel.id);
  return `${mark.n} · ${panel.name}`;
}

export function panelBoardIsComplete(): boolean {
  if (PANEL_BOARD_MARKS.length !== 12) return false;
  if (PANEL_BOARD_MARKS[0]?.panelId !== "hood") return false;
  if (PANEL_BOARD_MARKS[11]?.panelId !== "rear-fascia") return false;
  for (const mark of PANEL_BOARD_MARKS) {
    if (mark.n < 1 || mark.n > 12) return false;
    if (mark.hero.x < 0 || mark.hero.x > 100) return false;
    if (mark.hero.y < 0 || mark.hero.y > 100) return false;
  }
  return true;
}

/** object-position hints so each view crops the shared still toward that face. */
export const BOARD_VIEW_OBJECT_POSITION: Record<TruckViewId, string> = {
  side: "58% 48%",
  front: "42% 40%",
  rear: "82% 52%",
};
