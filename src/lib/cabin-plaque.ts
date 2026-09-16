/**
 * Cabin plaque name line. Not a panel bid. No price — CAMPAIGN has none.
 * Slice 13.30 — UI / authenticated nav stay dark while TRUCK_EXISTS is false.
 */

import { FLOOR_USD, GOAL_USD, TRUCK_EXISTS, formatUsd } from "./campaign";

export const CABIN_PLAQUE_LEAD = `Put a name inside the cabin after install. This is not a panel seat. Floor stays ${formatUsd(FLOOR_USD)}. Buyout stays ${formatUsd(GOAL_USD)}.`;

export type CabinPlaqueLine = {
  id: string;
  displayName: string;
  createdAt: string;
};

/** Cabin plaque form + nav only after the truck exists. */
export function cabinPlaqueUiAllowed(
  truckExists: boolean = TRUCK_EXISTS,
): boolean {
  return truckExists;
}

export function normalizePlaqueName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function plaqueNameIsValid(raw: string): boolean {
  const name = normalizePlaqueName(raw);
  return name.length >= 2 && name.length <= 40;
}

export function assertPlaqueIsNotABid(line: CabinPlaqueLine): void {
  const forbidden = line as CabinPlaqueLine & {
    standingUsd?: unknown;
    depositUsd?: unknown;
    stripePaymentMethodId?: unknown;
    setupIntentId?: unknown;
  };
  if (
    forbidden.standingUsd != null ||
    forbidden.depositUsd != null ||
    forbidden.stripePaymentMethodId != null ||
    forbidden.setupIntentId != null
  ) {
    throw new Error("Cabin plaque must not carry bid or Stripe fields");
  }
}
