/**
 * Slice 9.6 — failed-winner offer: last mark + one increment.
 * Explicit offer only — no silent reopen. Still intent only — no card.
 */

import { formatUsd } from "./campaign";
import { nextStandingUsd } from "./intent";

export type FailedWinnerOffer = {
  lastMarkUsd: number;
  /** last mark + max($250, 10%), floored up to current panel minimum. */
  offerUsd: number;
  fromLastIncrementOnly: boolean;
};

export function failedWinnerOfferUsd(lastMarkUsd: number): number {
  return nextStandingUsd(lastMarkUsd);
}

/**
 * Build the explicit re-list offer for an outbid viewer.
 * Offer is never below the live panel minimum (cannot silently ignore standing).
 */
export function buildFailedWinnerOffer(input: {
  lastMarkUsd: number;
  panelMinimumUsd: number;
}): FailedWinnerOffer {
  const fromLast = failedWinnerOfferUsd(input.lastMarkUsd);
  const offerUsd = Math.max(fromLast, input.panelMinimumUsd);
  return {
    lastMarkUsd: input.lastMarkUsd,
    offerUsd,
    fromLastIncrementOnly: offerUsd === fromLast,
  };
}

export function failedWinnerOfferCopy(offer: FailedWinnerOffer): string {
  return `Failed-winner offer: re-list at ${formatUsd(offer.offerUsd)} — your last mark ${formatUsd(offer.lastMarkUsd)} + one increment (max($250, 10%)). Still not charged. No silent reopen.`;
}
