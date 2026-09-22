/**
 * Pexels photographer credits for Preview the Panels stills.
 * URLs match scripts/credit-board-stills.py. Edited-with line is PUBLIC_COPY.
 */

import type { TruckViewId } from "./truck-views";

export type TruckViewCredit = {
  readonly artist: string;
  readonly url: string;
};

export const TRUCK_VIEW_CREDITS: Record<TruckViewId, TruckViewCredit> = {
  front: {
    artist: "Mylo Kaye",
    url: "https://www.pexels.com/photo/tesla-cyber-truck-24734499/",
  },
  driver: {
    artist: "Joe L",
    url: "https://www.pexels.com/photo/a-car-is-parked-in-a-garage-with-a-large-concrete-floor-27908531/",
  },
  passenger: {
    artist: "Mylo Kaye",
    url: "https://www.pexels.com/photo/silver-tesla-cybertruck-24734498/",
  },
  rear: {
    artist: "Stephen Leonardi",
    url: "https://www.pexels.com/photo/futuristic-truck-on-a-forest-road-in-autumn-29278630/",
  },
};

export function truckViewCreditLine(credit: TruckViewCredit): string {
  return `Photo by ${credit.artist} on Pexels`;
}
