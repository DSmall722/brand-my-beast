/**
 * Local Cybertruck stills. Hero stays the 1280 / 640 pair. Front and rear
 * TRACE AID flats are 2048×1360. Driver is the garage bake (1792×1104).
 * Passenger is the plaza bake (1728×1152).
 */

import { HERO_STILL_WIDE } from "./hero-still";
import type { TruckViewId } from "./truck-views";

/** Front and rear TRACE AID teaching plates. */
export const TRACE_AID_STILL = { width: 2048, height: 1360 } as const;

/** Driver Preview the Panels bake. Nose left. Seats 4–6 labeled in the pixels. */
export const DRIVER_BOARD_STILL = { width: 1792, height: 1104 } as const;

/** Passenger Preview the Panels bake. Nose right. Seats 7–9 labeled in the pixels. */
export const PASSENGER_BOARD_STILL = { width: 1728, height: 1152 } as const;

export function truckViewStillSize(
  view: TruckViewId,
): { readonly width: number; readonly height: number } {
  switch (view) {
    case "driver":
      return DRIVER_BOARD_STILL;
    case "passenger":
      return PASSENGER_BOARD_STILL;
    case "front":
    case "rear":
      return TRACE_AID_STILL;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export const TRUCK_VIEW_STILLS: Record<TruckViewId, string> = {
  driver: "/truck-view-driver.jpg",
  passenger: "/truck-view-passenger.jpg",
  front: "/truck-view-front.jpg",
  rear: "/truck-view-rear.jpg",
};

export type TruckStillId = "hero" | TruckViewId;

export type PanelFaceCrop = {
  readonly still: TruckStillId;
  readonly objectPosition: string;
  /** CSS background-size. Side cards zoom into one panel; front/rear stay cover. */
  readonly backgroundSize?: string;
};

export function truckStillSrc(still: TruckStillId): string {
  switch (still) {
    case "hero":
      return HERO_STILL_WIDE.src;
    case "driver":
      return TRUCK_VIEW_STILLS.driver;
    case "passenger":
      return TRUCK_VIEW_STILLS.passenger;
    case "front":
      return TRUCK_VIEW_STILLS.front;
    case "rear":
      return TRUCK_VIEW_STILLS.rear;
    default: {
      const _exhaustive: never = still;
      return _exhaustive;
    }
  }
}

export function truckViewStillSrc(view: TruckViewId): string {
  return TRUCK_VIEW_STILLS[view];
}

export function parseObjectPosition(value: string): { x: number; y: number } | null {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!match) return null;
  return { x: Number(match[1]), y: Number(match[2]) };
}
