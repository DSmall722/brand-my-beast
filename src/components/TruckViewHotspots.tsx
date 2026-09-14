"use client";

import { useState } from "react";
import { PANELS, type Panel } from "@/lib/campaign";
import {
  TRUCK_VIEWS,
  TRUCK_VIEWS_LEAD,
  hotspotsForView,
  type TruckViewId,
} from "@/lib/truck-views";

/**
 * Side / front / rear toggles with SVG seat hotspots.
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
        <svg
          className="truck-view-svg"
          viewBox="0 0 400 160"
          role="img"
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
                    ? `${panel?.name ?? spot.panelId} — seat held`
                    : `${panel?.name ?? spot.panelId} — raw 30X open seat`
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
          <span data-testid="truck-view-legend-raw">Raw 30X = open seat</span>
          {" · "}
          <span data-testid="truck-view-legend-held">
            Held = standing intent
          </span>
          {" · "}
          <span data-testid="truck-view-legend-no-360">Not a 360</span>
        </p>
      </div>
    </div>
  );
}
