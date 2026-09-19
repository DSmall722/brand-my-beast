"use client";

import { useState } from "react";
import { PanelBoardCallouts } from "@/components/PanelBoardCallouts";
import { PANELS, type Panel } from "@/lib/campaign";
import { BOARD_VIEW_OBJECT_POSITION } from "@/lib/panel-board";
import { truckImgAlt } from "@/lib/truck-img-alt";
import {
  TRUCK_VIEWS,
  TRUCK_VIEWS_LEAD,
  hotspotsForView,
  type TruckViewId,
} from "@/lib/truck-views";

/**
 * Side / front / rear toggles with stainless photo + numbered seats.
 * Empty seats render as raw 30X. Not a 360. Preview only.
 */
export function TruckViewHotspots({
  occupiedPanelIds = [],
  activePanelId,
  compact = false,
}: {
  /** Panel ids with a listed/approved standing mark. */
  occupiedPanelIds?: readonly string[];
  /** Highlight the open seat when rendered on /panels/[id]. */
  activePanelId?: Panel["id"];
  compact?: boolean;
}) {
  const [view, setView] = useState<TruckViewId>("side");
  const occupied = new Set(occupiedPanelIds);
  const spots = hotspotsForView(view);

  return (
    <div
      className={
        compact
          ? "truck-view-hotspots truck-view-hotspots-compact"
          : "truck-view-hotspots"
      }
      data-testid="truck-view-hotspots"
      data-view={view}
      data-one-view="true"
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
        {/* eslint-disable-next-line @next/next/no-img-element -- shared stainless still */}
        <img
          className="truck-view-photo"
          src="/hero-truck-preview.jpg"
          alt={truckImgAlt("hero")}
          width={1280}
          height={720}
          decoding="async"
          data-testid={`truck-img-board-${view}`}
          data-truck-img={`board-${view}`}
          style={{ objectPosition: BOARD_VIEW_OBJECT_POSITION[view] }}
        />
        <PanelBoardCallouts
          surface="view"
          view={view}
          occupiedPanelIds={occupiedPanelIds}
        />
        <svg
          className="truck-view-svg"
          viewBox="0 0 400 160"
          role="group"
          aria-label={`${view} view of the board truck with panel hotspots`}
          data-testid="truck-view-svg"
          data-view={view}
        >
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
          {spots.map((spot) => {
            const panel = PANELS.find((row) => row.id === spot.panelId);
            const held = occupied.has(spot.panelId);
            const active = activePanelId === spot.panelId;
            return (
              <a
                key={`${view}-${spot.panelId}`}
                href={`/panels/${spot.panelId}`}
                data-testid={`truck-hotspot-${spot.panelId}`}
                data-occupied={held ? "true" : "false"}
                data-active={active ? "true" : "false"}
                data-raw={held ? "false" : "true"}
                aria-label={
                  held
                    ? `${panel?.name ?? spot.panelId} — Held = standing intent`
                    : `${panel?.name ?? spot.panelId} — Open seat`
                }
              >
                <polygon
                  className={
                    active
                      ? "truck-hotspot is-active"
                      : held
                        ? "truck-hotspot is-held"
                        : "truck-hotspot is-raw"
                  }
                  points={spot.points}
                />
              </a>
            );
          })}
        </svg>
        <p className="truck-view-legend" data-testid="truck-view-legend">
          <span data-testid="truck-view-legend-open">Open seat</span>
          {" · "}
          <span data-testid="truck-view-legend-held">
            Held = standing intent
          </span>
        </p>
      </div>
    </div>
  );
}
