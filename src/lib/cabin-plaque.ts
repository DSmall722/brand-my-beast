/**
 * Cabin plaque name line. Not a panel bid. No price — CAMPAIGN has none.
 */

import { FLOOR_USD, GOAL_USD, formatUsd } from "./campaign";

export const CABIN_PLAQUE_LEAD = `A name inside the cabin after install. Not a panel seat. Not a bid. Floor stays ${formatUsd(FLOOR_USD)}. Buyout stays ${formatUsd(GOAL_USD)}. Still no card charge.`;

export type CabinPlaqueLine = {
  id: string;
  displayName: string;
  createdAt: string;
};

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
