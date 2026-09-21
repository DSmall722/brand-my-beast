"use client";

import { useState } from "react";
import { PanelBoardCallouts } from "@/components/PanelBoardCallouts";
import { PANELS, type Panel } from "@/lib/campaign";
import { BOARD_VIEW_OBJECT_POSITION } from "@/lib/panel-board";
import { truckViewStillSrc } from "@/lib/truck-stills";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { truckImgAlt } from "@/lib/truck-img-alt";
import {
  TRUCK_VIEWS,
  TRUCK_VIEWS_LEAD,
  hotspotsForView,
  type TruckViewId,
} from "@/lib/truck-views";

/**
 * Driver / passenger / front / rear toggles with stainless photo + seats.
 * Homepage board uses baked JPEG marks (`bakedMarks`). Seat pages keep
 * the overlay map for the open seat.
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
  /** Static stills with numbers painted in. No DOM / SVG overlays. */
  bakedMarks?: boolean;
}) {
  const [view, setView] = useState<TruckViewId>("driver");
  const occupied = new Set(occupiedPanelIds);
  const spots = bakedMarks ? [] : hotspotsForView(view);

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
      data-polygons="hidden"
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
          {bakedMarks ? null : (
          <svg
            className="truck-view-svg"
            viewBox="0 0 400 160"
            preserveAspectRatio="none"
            role="group"
            aria-label={`${view} view of the board truck with panel seats`}
            data-testid="truck-view-svg"
            data-view={view}
          >
            {view === "driver" || view === "passenger" ? (
              <>
                <rect
                  className="truck-view-body"
                  x="24"
                  y="36"
                  width="352"
                  height="92"
                  rx="6"
                />
                <rect
                  className="truck-view-cab"
                  x="56"
                  y="22"
                  width="120"
                  height="28"
                  rx="3"
                />
              </>
            ) : null}
            {spots.map((spot) => {
              const panel = PANELS.find((row) => row.id === spot.panelId);
              const held = occupied.has(spot.panelId);
              const active = activePanelId === spot.panelId;
              return (
                <a
                  key={`${view}-${spot.panelId}`}
                  href={`/panels/${spot.panelId}`}
                  data-testid={`truck-seat-${spot.panelId}`}
                  data-occupied={held ? "true" : "false"}
                  data-active={active ? "true" : "false"}
                  data-raw={held ? "false" : "true"}
                  aria-label={
                    held
                      ? `${panel?.name ?? spot.panelId} — held seat`
                      : `${panel?.name ?? spot.panelId} — open seat`
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
                  />
                </a>
              );
            })}
          </svg>
          )}
        </div>
        <p className="truck-view-legend" data-testid="truck-view-legend">
          {PUBLIC_COPY.board.seatLegend}
        </p>
      </div>
    </div>
  );
}
