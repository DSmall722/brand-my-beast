import {
  PANEL_BOARD_MARKS,
  panelBoardMarksForView,
  type PanelBoardMark,
} from "@/lib/panel-board";
import type { TruckViewId } from "@/lib/truck-views";

/**
 * Slice 14.0 — numbered 1–12 callouts linking to `/panels/[id]`.
 * Hero shows all twelve; truck views show the angle’s subset.
 */
export function PanelBoardCallouts({
  surface,
  view,
}: {
  surface: "hero" | "view";
  view?: TruckViewId;
}) {
  const marks: readonly PanelBoardMark[] =
    surface === "hero"
      ? PANEL_BOARD_MARKS
      : panelBoardMarksForView(view ?? "side");

  return (
    <div
      className={
        surface === "hero"
          ? "panel-board panel-board-hero"
          : "panel-board panel-board-view"
      }
      data-testid={
        surface === "hero" ? "hero-panel-board" : `view-panel-board-${view}`
      }
      data-surface={surface}
      data-view={surface === "view" ? view : undefined}
      aria-label="Numbered stainless panel board"
    >
      {marks.map((mark) => {
        const pct =
          surface === "hero" ? mark.hero : mark.views[view ?? "side"];
        if (!pct) return null;
        const testId =
          surface === "hero"
            ? `hero-panel-board-${mark.n}`
            : `view-panel-board-${view}-${mark.n}`;
        return (
          <a
            key={`${surface}-${mark.panelId}`}
            className="panel-board-callout"
            href={`/panels/${mark.panelId}`}
            style={{ left: `${pct.x}%`, top: `${pct.y}%` }}
            data-testid={testId}
            data-panel-id={mark.panelId}
            data-panel-n={String(mark.n)}
            aria-label={`${mark.n} ${mark.name}`}
          >
            <span className="panel-board-callout-n" aria-hidden="true">
              {mark.n}
            </span>
          </a>
        );
      })}
    </div>
  );
}
