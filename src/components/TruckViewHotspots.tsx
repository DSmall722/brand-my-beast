"use client";

import { useEffect, useState } from "react";
import { PanelBoardCallouts } from "@/components/PanelBoardCallouts";
import { PANELS, type Panel } from "@/lib/campaign";
import {
  BOARD_VIEW_OBJECT_POSITION,
  panelBoardMarkFor,
  panelOverlayLabel,
} from "@/lib/panel-board";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { truckImgAlt } from "@/lib/truck-img-alt";
import { truckViewStillSize, truckViewStillSrc } from "@/lib/truck-stills";
import {
  TRUCK_VIEW_CREDITS,
  truckViewCreditLine,
} from "@/lib/truck-view-credits";
import {
  NAME_CHIP_RX_PER_RY,
  TRUCK_VIEWS,
  TRUCK_VIEW_BOX,
  hotspotsForView,
  nameChipsForView,
  viewOwningPanel,
  type TruckViewId,
} from "@/lib/truck-views";

/**
 * Driver / passenger / front / rear toggles on TRACE AID lime flats.
 * Homepage keeps bakedMarks. The polygon is an invisible hit pad.
 * A small lime pill sits on the baked `(N) Name` ink. Seat pages
 * lock to the owning camera and do not paint chips.
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
  const ownerView = activePanelId ? viewOwningPanel(activePanelId) : "front";
  const [view, setView] = useState<TruckViewId>(ownerView);
  const [litPanelId, setLitPanelId] = useState<string | null>(null);
  useEffect(() => {
    const blurBoardFocus = () => {
      const active = document.activeElement;
      if (
        !(active instanceof Element) ||
        !active.closest("[data-testid='truck-view-seats']")
      ) {
        return;
      }
      if (active instanceof HTMLElement || active instanceof SVGElement) {
        active.blur();
      }
    };
    const onPageShow = () => {
      setLitPanelId(null);
      blurBoardFocus();
    };
    window.addEventListener("pagehide", blurBoardFocus);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pagehide", blurBoardFocus);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  const occupied = new Set(occupiedPanelIds);
  const spots = hotspotsForView(singleSeat ? ownerView : view).filter((spot) =>
    singleSeat ? spot.panelId === activePanelId : true,
  );
  const shownView = singleSeat ? ownerView : view;
  const chips = singleSeat ? [] : nameChipsForView(shownView);
  const stillSize = truckViewStillSize(shownView);
  const credit = TRUCK_VIEW_CREDITS[shownView];
  /** Seat pages clear board overlays — sticky hover/active must not follow. */
  const polygonsMode = singleSeat ? "hidden" : "outline";

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
      data-polygons={polygonsMode}
      data-name-chips={singleSeat ? "false" : "true"}
      data-baked-marks={bakedMarks ? "true" : "false"}
      data-single-seat={singleSeat ? "true" : "false"}
      data-training="hybrid"
    >
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
            width={stillSize.width}
            height={stillSize.height}
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
              const light = () => setLitPanelId(spot.panelId);
              const dim = () => setLitPanelId(null);
              return (
                <a
                  key={`${shownView}-${spot.panelId}`}
                  href={`/panels/${spot.panelId}`}
                  data-testid={`truck-seat-${spot.panelId}`}
                  data-seat-id={spot.panelId}
                  data-occupied={held ? "true" : "false"}
                  data-active={singleSeat ? "false" : active ? "true" : "false"}
                  data-raw={held ? "false" : "true"}
                  data-seat-label={label}
                  data-panel-n={String(mark.n)}
                  aria-label={
                    held ? `${label} — held seat` : `${label} — open seat`
                  }
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onMouseEnter={light}
                  onMouseLeave={dim}
                  onFocus={light}
                  onBlur={dim}
                  onClick={(event) => {
                    dim();
                    event.currentTarget.blur();
                  }}
                >
                  <polygon
                    className={
                      !singleSeat && active
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
            {spots.map((spot) => {
              const chip = chips.find((row) => row.panelId === spot.panelId);
              if (!chip) return null;
              const chipRy = chip.h / 2;
              const lit = litPanelId === spot.panelId;
              return (
                <a
                  key={`${shownView}-chip-${spot.panelId}`}
                  className="truck-name-chip-link"
                  href={`/panels/${spot.panelId}`}
                  tabIndex={-1}
                  aria-hidden="true"
                  data-seat-id={spot.panelId}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onMouseEnter={() => setLitPanelId(spot.panelId)}
                  onMouseLeave={() => setLitPanelId(null)}
                  onFocus={() => setLitPanelId(spot.panelId)}
                  onBlur={() => setLitPanelId(null)}
                  onClick={(event) => {
                    setLitPanelId(null);
                    event.currentTarget.blur();
                  }}
                >
                  <rect
                    className={lit ? "truck-name-chip is-lit" : "truck-name-chip"}
                    data-testid={`truck-name-chip-${spot.panelId}`}
                    x={chip.x}
                    y={chip.y}
                    width={chip.w}
                    height={chip.h}
                    rx={chipRy * NAME_CHIP_RX_PER_RY}
                    ry={chipRy}
                  />
                </a>
              );
            })}
          </svg>
        </div>
        {singleSeat ? null : (
          <div className="truck-view-credit" data-testid="truck-view-credit">
            <p data-testid="truck-view-credit-photo">
              Photo by{" "}
              <a
                href={credit.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="truck-view-credit-link"
              >
                {credit.artist}
              </a>{" "}
              on Pexels
              <span className="sr-only"> — {truckViewCreditLine(credit)}</span>
            </p>
            <p data-testid="truck-view-credit-edit">
              {PUBLIC_COPY.truckViews.editedWith}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
