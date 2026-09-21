"use client";

import { useEffect, useState } from "react";
import { PanelBoardCallouts } from "@/components/PanelBoardCallouts";
import { PANELS, type Panel } from "@/lib/campaign";
import { BOARD_VIEW_OBJECT_POSITION, panelBoardMarkFor, panelOverlayLabel } from "@/lib/panel-board";
import { truckViewStillSrc } from "@/lib/truck-stills";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { truckImgAlt } from "@/lib/truck-img-alt";
import {
  TRUCK_VIEWS,
  TRUCK_VIEWS_LEAD,
  TRUCK_VIEW_BOX,
  hotspotsForView,
  type TruckViewId,
} from "@/lib/truck-views";

function hoverIsAvailable(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(hover: hover)").matches;
}

/**
 * Driver / passenger / front / rear toggles with stainless photo + seats.
 * Homepage keeps baked JPEG numbers (`bakedMarks`) and adds lime outlines.
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
  /** Static stills with numbers painted in. No numbered CSS discs. */
  bakedMarks?: boolean;
}) {
  const [view, setView] = useState<TruckViewId>("driver");
  const [filledId, setFilledId] = useState<string | null>(null);
  const [liveId, setLiveId] = useState<string | null>(null);
  const occupied = new Set(occupiedPanelIds);
  const spots = hotspotsForView(view);
  const shownId = filledId ?? liveId;
  const shownLabel = shownId
    ? panelOverlayLabel(panelBoardMarkFor(shownId))
    : "";

  useEffect(() => {
    setFilledId(null);
    setLiveId(null);
  }, [view]);

  return (
    <div
      className={
        compact
          ? "truck-view-seats truck-view-seats-compact"
          : "truck-view-seats"
      }
      data-testid="truck-view-seats"
      data-view={view}
      data-one-view="true"
      data-polygons="outline"
      data-baked-marks={bakedMarks ? "true" : "false"}
    >
      <p className="auth-hint truck-view-lead" data-testid="truck-view-lead">
        {TRUCK_VIEWS_LEAD}
      </p>
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
              view === row.id ? "truck-view-tab is-active" : "truck-view-tab"
            }
            data-testid={`truck-view-${row.id}`}
            aria-pressed={view === row.id}
            onClick={() => setView(row.id)}
          >
            {row.label}
          </button>
        ))}
      </div>

      <div className="truck-view-stage" data-testid="truck-view-stage">
        <div
          className="truck-view-photo-well"
          data-testid="truck-view-photo-well"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- shared stainless still */}
          <img
            className="truck-view-photo"
            src={truckViewStillSrc(view)}
            alt={truckImgAlt("board")}
            width={1280}
            height={720}
            decoding="async"
            data-testid={`truck-img-board-${view}`}
            data-truck-img={`board-${view}`}
            style={{ objectPosition: BOARD_VIEW_OBJECT_POSITION[view] }}
          />
          {bakedMarks ? null : (
            <PanelBoardCallouts
              surface="view"
              view={view}
              occupiedPanelIds={occupiedPanelIds}
            />
          )}
          <svg
            className="truck-view-svg"
            viewBox={`0 0 ${TRUCK_VIEW_BOX.w} ${TRUCK_VIEW_BOX.h}`}
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label={`${view} view of the board truck with panel seats`}
            data-testid="truck-view-svg"
            data-view={view}
          >
            {spots.map((spot) => {
              const panel = PANELS.find((row) => row.id === spot.panelId);
              if (!panel) return null;
              const mark = panelBoardMarkFor(spot.panelId);
              const label = panelOverlayLabel(mark);
              const held = occupied.has(spot.panelId);
              const active = activePanelId === spot.panelId;
              const filled = filledId === spot.panelId;
              const lit = filled || liveId === spot.panelId;
              return (
                <a
                  key={`${view}-${spot.panelId}`}
                  href={`/panels/${spot.panelId}`}
                  data-testid={`truck-seat-${spot.panelId}`}
                  data-occupied={held ? "true" : "false"}
                  data-active={active ? "true" : "false"}
                  data-raw={held ? "false" : "true"}
                  data-filled={filled ? "true" : "false"}
                  data-lit={lit ? "true" : "false"}
                  data-seat-label={label}
                  data-panel-n={String(mark.n)}
                  aria-label={
                    held ? `${label} — held seat` : `${label} — open seat`
                  }
                  onMouseEnter={() => setLiveId(spot.panelId)}
                  onMouseLeave={() =>
                    setLiveId((current) =>
                      current === spot.panelId ? null : current,
                    )
                  }
                  onFocus={() => setLiveId(spot.panelId)}
                  onBlur={() =>
                    setLiveId((current) =>
                      current === spot.panelId ? null : current,
                    )
                  }
                  onClick={(event) => {
                    if (hoverIsAvailable()) return;
                    if (filledId !== spot.panelId) {
                      event.preventDefault();
                      setFilledId(spot.panelId);
                      setLiveId(spot.panelId);
                    }
                  }}
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
                  />
                </a>
              );
            })}
          </svg>
        </div>
        <p
          className="truck-seat-caption"
          data-testid="truck-seat-caption"
          data-has-label={shownLabel ? "true" : "false"}
          aria-live="polite"
        >
          {shownLabel || "\u00a0"}
        </p>
        <p className="truck-view-legend" data-testid="truck-view-legend">
          {PUBLIC_COPY.board.seatLegend}
        </p>
      </div>
    </div>
  );
}
