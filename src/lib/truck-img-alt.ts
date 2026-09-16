/**
 * Slice 10.8 — every truck `<img>` alt comes from PUBLIC_COPY.
 * Artwork thumbs are not truck photos and stay out of this set.
 */

import { PUBLIC_COPY } from "./public-copy";

/** Allowed alt strings for truck photos on the public site. */
export const TRUCK_IMG_ALTS = [PUBLIC_COPY.hero.imageAlt] as const;

export type TruckImgRole = "hero";

export function truckImgAlt(role: TruckImgRole): string {
  switch (role) {
    case "hero":
      return PUBLIC_COPY.hero.imageAlt;
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

export function isPublicCopyTruckAlt(alt: string): boolean {
  return (TRUCK_IMG_ALTS as readonly string[]).includes(alt);
}
