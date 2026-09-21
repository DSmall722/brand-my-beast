/**
 * Local Cybertruck stills. Hero stays the 1280 / 640 pair. Driver /
 * passenger / front / rear are TRACE AID lime flats (2048×1360).
 */

import { HERO_STILL_WIDE } from "./hero-still";
import type { TruckViewId } from "./truck-views";

/** Dennard-approved TRACE AID teaching plates. Labels are in the pixels. */
export const TRACE_AID_STILL = { width: 2048, height: 1360 } as const;

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
