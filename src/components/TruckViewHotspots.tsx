"use client";

import { useState } from "react";
import { PanelBoardCallouts } from "@/components/PanelBoardCallouts";
import { PANELS, type Panel } from "@/lib/campaign";
import { BOARD_VIEW_OBJECT_POSITION } from "@/lib/panel-board";
import {
  TRAINING_VIEWBOX,
  hotspotCenterInTraining,
  scaleHotspotPointsToTraining,
  seatOwningView,
  trainingActiveCaption,
  trainingLabelFor,
  trainingRestCaption,
} from "@/lib/panel-training";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { truckImgAlt } from "@/lib/truck-img-alt";
import { truckViewStillSrc } from "@/lib/truck-stills";
import {
  TRUCK_VIEWS,
  TRUCK_VIEWS_LEAD,
  hotspotsForView,
  type TruckViewId,
} from "@/lib/truck-views";

/**
 * Homepage board stays baked-mark-free stills (`bakedMarks`).
 * Seat pages lock to the camera that owns the seat and paint SVG
 * rest-wash / hover-fill overlays. Labels live on the overlay.
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
  /** Homepage: stills only. No DOM / SVG overlays. */
  bakedMarks?: boolean;
}) {
  const lockedView = activePanelId ? seatOwningView(activePanelId) : undefined;
  const training = Boolean(activePanelId) && !bakedMarks;
  const [view, setView] = useState<TruckViewId>(lockedView ?? "driver");
  const shownView = lockedView ?? view;
  const occupied = new Set(occupiedPanelIds);
  const spots = bakedMarks ? [] : hotspotsForView(shownView);

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
      data-polygons={training ? "training" : "hidden"}
      data-baked-marks={bakedMarks ? "true" : "false"}
      data-locked-view={lockedView ?? "false"}
    >
      {training ? null : (
        <p className="auth-hint truck-view-lead" data-testid="truck-view-lead">
          {TRUCK_VIEWS_LEAD}
        </p>
      )}
      {training ? null : (
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
            width={1280}
            height={720}
            decoding="async"
            data-testid={`truck-img-board-${shownView}`}
            data-truck-img={`board-${shownView}`}
            style={{ objectPosition: BOARD_VIEW_OBJECT_POSITION[shownView] }}
          />
          {bakedMarks || training ? null : (
            <PanelBoardCallouts
              surface="view"
              view={shownView}
              occupiedPanelIds={occupiedPanelIds}
            />
          )}
          {bakedMarks ? null : (
            <svg
              className="truck-view-svg"
              viewBox={
                training
                  ? `0 0 ${TRAINING_VIEWBOX.width} ${TRAINING_VIEWBOX.height}`
                  : "0 0 400 160"
              }
              preserveAspectRatio={training ? "xMidYMid meet" : "none"}
              role="group"
              aria-label={`${shownView} view of the board truck with panel seats`}
              data-testid="truck-view-svg"
              data-view={shownView}
            >
              {!training && (shownView === "driver" || shownView === "passenger") ? (
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
                const label = trainingLabelFor(spot.panelId);
                const center = hotspotCenterInTraining(spot.points);
                const points = training
                  ? scaleHotspotPointsToTraining(spot.points)
                  : spot.points;
                return (
                  <a
                    key={`${shownView}-${spot.panelId}`}
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
                      points={points}
                    />
                    {training ? (
                      <circle
                        className="truck-seat-hit"
                        cx={center.x}
                        cy={center.y}
                        r="112"
                      />
                    ) : null}
                    {training ? (
                      <g
                        className="truck-seat-label"
                        data-testid={`truck-seat-label-${spot.panelId}`}
                        data-active={active ? "true" : "false"}
                      >
                        <circle
                          className="truck-seat-badge"
                          cx={center.x - 92}
                          cy={center.y - 10}
                          r="16"
                        />
                        <text
                          className="truck-seat-badge-n"
                          x={center.x - 92}
                          y={center.y - 10}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {label.n}
                        </text>
                        <text
                          className="truck-seat-caption truck-seat-caption-rest"
                          x={center.x}
                          y={center.y - 10}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {trainingRestCaption(label)}
                        </text>
                        <text
                          className="truck-seat-caption truck-seat-caption-active"
                          x={center.x + 8}
                          y={center.y - 10}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {trainingActiveCaption(label)}
                        </text>
                      </g>
                    ) : null}
                  </a>
                );
              })}
            </svg>
          )}
        </div>
        {training ? null : (
          <p className="truck-view-legend" data-testid="truck-view-legend">
            {PUBLIC_COPY.board.seatLegend}
          </p>
        )}
      </div>
    </div>
  );
}
