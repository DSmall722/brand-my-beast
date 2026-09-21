"use client";

import { useState } from "react";
import { PanelBoardCallouts } from "@/components/PanelBoardCallouts";
import { PANELS, type Panel } from "@/lib/campaign";
import {
  BOARD_VIEW_OBJECT_POSITION,
  panelBoardMarkFor,
  panelOverlayLabel,
} from "@/lib/panel-board";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { truckImgAlt } from "@/lib/truck-img-alt";
import { TRACE_AID_STILL, truckViewStillSrc } from "@/lib/truck-stills";
import {
  TRUCK_VIEWS,
  TRUCK_VIEWS_LEAD,
  TRUCK_VIEW_BOX,
  hotspotsForView,
  viewOwningPanel,
  type TruckViewId,
} from "@/lib/truck-views";

/**
 * Driver / passenger / front / rear toggles on TRACE AID lime flats.
 * Homepage keeps bakedMarks (no CSS discs). SVG is hit/hover only —
 * `(N) Name` is already in the JPEG. Seat pages lock to the owning camera.
 */
export function TruckViewHotspots({
  occupiedPanelIds = [],
  activePanelId,
  compact = false,
  bakedMarks = false,
}: {
  /** Panel ids with a listed/approved standing mark. */
  occupiedPanelIds?: readonly string[];
  /** Highlight the open seat when rendered on /panels/[id]. */
  activePanelId?: Panel["id"];
  compact?: boolean;
  /** No numbered CSS discs. SVG overlays still render. */
  bakedMarks?: boolean;
}) {
  const singleSeat = Boolean(activePanelId) && compact;
  const ownerView = activePanelId ? viewOwningPanel(activePanelId) : "driver";
  const [view, setView] = useState<TruckViewId>(ownerView);
  const occupied = new Set(occupiedPanelIds);
  const spots = hotspotsForView(singleSeat ? ownerView : view).filter((spot) =>
    singleSeat ? spot.panelId === activePanelId : true,
  );
  const shownView = singleSeat ? ownerView : view;

  return (
    <div
      className={
        compact
          ? "truck-view-seats truck-view-seats-compact"
          : "truck-view-seats"
      }
      data-testid="truck-view-seats"
      data-view={shownView}
      data-one-view="true"
      data-polygons="outline"
      data-baked-marks={bakedMarks ? "true" : "false"}
      data-single-seat={singleSeat ? "true" : "false"}
      data-training="hybrid"
    >
      {singleSeat ? null : (
        <p className="auth-hint truck-view-lead" data-testid="truck-view-lead">
          {TRUCK_VIEWS_LEAD}
        </p>
      )}
      {singleSeat ? null : (
        <div
          className="truck-view-toolbar"
          data-testid="truck-view-toolbar"
          role="group"
          aria-label="Truck view"
        >
          {TRUCK_VIEWS.map((row) => (
            <button
              key={row.id}
              type="button"
              className={
                shownView === row.id ? "truck-view-tab is-active" : "truck-view-tab"
              }
              data-testid={`truck-view-${row.id}`}
              aria-pressed={shownView === row.id}
              onClick={() => setView(row.id)}
            >
              {row.label}
            </button>
          ))}
        </div>
      )}

      <div className="truck-view-stage" data-testid="truck-view-stage">
        <div
          className="truck-view-photo-well"
          data-testid="truck-view-photo-well"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- shared stainless still */}
          <img
            className="truck-view-photo"
            src={truckViewStillSrc(shownView)}
            alt={truckImgAlt("board")}
            width={TRACE_AID_STILL.width}
            height={TRACE_AID_STILL.height}
            decoding="async"
            data-testid={`truck-img-board-${shownView}`}
            data-truck-img={`board-${shownView}`}
            style={{ objectPosition: BOARD_VIEW_OBJECT_POSITION[shownView] }}
          />
          {bakedMarks || singleSeat ? null : (
            <PanelBoardCallouts
              surface="view"
              view={shownView}
              occupiedPanelIds={occupiedPanelIds}
            />
          )}
          <svg
            className="truck-view-svg"
            viewBox={`0 0 ${TRUCK_VIEW_BOX.w} ${TRUCK_VIEW_BOX.h}`}
            preserveAspectRatio="none"
            role="group"
            aria-label={`${shownView} view of the board truck with panel seats`}
            data-testid="truck-view-svg"
            data-view={shownView}
          >
            {spots.map((spot) => {
              const panel = PANELS.find((row) => row.id === spot.panelId);
              if (!panel) return null;
              const mark = panelBoardMarkFor(spot.panelId);
              const label = panelOverlayLabel(mark);
              const held = occupied.has(spot.panelId);
              const active = activePanelId === spot.panelId;
              return (
                <a
                  key={`${shownView}-${spot.panelId}`}
                  href={`/panels/${spot.panelId}`}
                  data-testid={`truck-seat-${spot.panelId}`}
                  data-occupied={held ? "true" : "false"}
                  data-active={active ? "true" : "false"}
                  data-raw={held ? "false" : "true"}
                  data-seat-label={label}
                  data-panel-n={String(mark.n)}
                  aria-label={
                    held ? `${label} — held seat` : `${label} — open seat`
                  }
                >
                  <polygon
                    className={
                      active
                        ? "truck-seat is-active"
                        : held
                          ? "truck-seat is-held"
                          : "truck-seat is-raw"
                    }
                    points={spot.points}
                    fill="none"
                  />
                </a>
              );
            })}
          </svg>
        </div>
        {singleSeat ? null : (
          <p className="truck-view-legend" data-testid="truck-view-legend">
            {PUBLIC_COPY.board.seatLegend}
          </p>
        )}
      </div>
    </div>
  );
}
