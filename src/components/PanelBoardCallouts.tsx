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
  occupiedPanelIds = [],
}: {
  surface: "hero" | "view";
  view?: TruckViewId;
  occupiedPanelIds?: readonly string[];
}) {
  const marks: readonly PanelBoardMark[] =
    surface === "hero"
      ? PANEL_BOARD_MARKS
      : panelBoardMarksForView(view ?? "side");
  const occupied = new Set(occupiedPanelIds);

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
      data-mobile-board={surface === "hero" ? "off-cab" : undefined}
      data-view={surface === "view" ? view : undefined}
      aria-label="Numbered stainless panel board"
    >
      {marks.map((mark) => {
        const pct =
          surface === "hero" ? mark.hero : mark.views[view ?? "side"];
        if (!pct) return null;
        const mobile = surface === "hero" ? mark.heroMobile : undefined;
        const held = occupied.has(mark.panelId);
        const testId =
          surface === "hero"
            ? `hero-panel-board-${mark.n}`
            : `view-panel-board-${view}-${mark.n}`;
        const heldTestId =
          surface === "hero"
            ? `hero-panel-held-${mark.n}`
            : `view-panel-held-${view}-${mark.n}`;
        return (
          <a
            key={`${surface}-${mark.panelId}`}
            className="panel-board-callout"
            href={`/panels/${mark.panelId}`}
            style={{
              ["--board-x" as string]: `${pct.x}%`,
              ["--board-y" as string]: `${pct.y}%`,
              ...(mobile
                ? {
                    ["--hero-mobile-x" as string]: `${mobile.x}%`,
                    ["--hero-mobile-y" as string]: `${mobile.y}%`,
                  }
                : {}),
            }}
            data-testid={testId}
            data-panel-id={mark.panelId}
            data-panel-n={String(mark.n)}
            data-held={held ? "true" : "false"}
            data-hero-mobile-y={mobile ? String(mobile.y) : undefined}
            aria-label={
              held ? `${mark.n} ${mark.name} Held` : `${mark.n} ${mark.name}`
            }
          >
            <span className="panel-board-callout-n" aria-hidden="true">
              {mark.n}
            </span>
            {held ? (
              <span className="panel-board-callout-held" data-testid={heldTestId}>
                Held
              </span>
            ) : null}
          </a>
        );
      })}
    </div>
  );
}
