/**
 * Local Cybertruck stills. Hero stays the 1280 / 640 pair. Side / front /
 * rear are dedicated faces — not object-position crops of one photo.
 */

import { HERO_STILL_WIDE } from "./hero-still";
import type { TruckViewId } from "./truck-views";

export const TRUCK_VIEW_STILLS: Record<TruckViewId, string> = {
  side: "/truck-view-side.jpg",
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
    case "side":
      return TRUCK_VIEW_STILLS.side;
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
