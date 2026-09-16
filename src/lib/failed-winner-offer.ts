/**
 * Slice 9.6 / 13.11 — failed-winner offer: last mark + one increment.
 * Explicit offer only — expires after TTL, then next compliant mark.
 * No silent reopen. Still intent only — no card.
 */

import { formatUsd } from "./campaign";
import {
  nextStandingUsd,
  type IntentBid,
} from "./intent";
import { findBannedTradeReason } from "./banned-trades";
import { PUBLIC_COPY } from "./public-copy";

/** Exclusive offer window after outbid / seat-open handoff (slice 13.11). */
export const FAILED_WINNER_OFFER_TTL_MS = 24 * 60 * 60 * 1000;

export type FailedWinnerOffer = {
  lastMarkUsd: number;
  /** last mark + max($250, 10%), floored up to current panel minimum. */
  offerUsd: number;
  fromLastIncrementOnly: boolean;
  /** ISO expiry. Slice 13.11. */
  expiresAt: string;
  /** True when `now` is at or past expiresAt. */
  expired: boolean;
};

export type FailedWinnerCandidate = {
  bid: IntentBid;
  offer: FailedWinnerOffer;
  offeredAt: string;
};

export function failedWinnerOfferUsd(lastMarkUsd: number): number {
  return nextStandingUsd(lastMarkUsd);
}

export function failedWinnerOfferExpiresAt(offeredAtIso: string): string {
  return new Date(
    Date.parse(offeredAtIso) + FAILED_WINNER_OFFER_TTL_MS,
  ).toISOString();
}

export function isFailedWinnerOfferExpired(
  offeredAtIso: string,
  now: Date = new Date(),
): boolean {
  const start = Date.parse(offeredAtIso);
  if (!Number.isFinite(start)) return true;
  return now.getTime() >= start + FAILED_WINNER_OFFER_TTL_MS;
}

/**
 * Vacant seat after reject: window starts at latest reject.
 * Occupied seat outbid re-list: window starts when that mark was outbid.
 */
export function failedWinnerOfferedAt(input: {
  bidUpdatedAt: string;
  seatOpen: boolean;
  seatOpenedAt: string | null;
}): string {
  if (input.seatOpen && input.seatOpenedAt) {
    return input.seatOpenedAt;
  }
  return input.bidUpdatedAt;
}

/**
 * Build the explicit re-list offer for an outbid viewer.
 * Offer is never below the live panel minimum (cannot silently ignore standing).
 */
export function buildFailedWinnerOffer(input: {
  lastMarkUsd: number;
  panelMinimumUsd: number;
  offeredAt: string;
  now?: Date;
}): FailedWinnerOffer {
  const fromLast = failedWinnerOfferUsd(input.lastMarkUsd);
  const offerUsd = Math.max(fromLast, input.panelMinimumUsd);
  const expiresAt = failedWinnerOfferExpiresAt(input.offeredAt);
  const now = input.now ?? new Date();
  return {
    lastMarkUsd: input.lastMarkUsd,
    offerUsd,
    fromLastIncrementOnly: offerUsd === fromLast,
    expiresAt,
    expired: isFailedWinnerOfferExpired(input.offeredAt, now),
  };
}

export function failedWinnerOfferCopy(offer: FailedWinnerOffer): string {
  return PUBLIC_COPY.seat.failedWinnerLeadTemplate
    .replace("{amount}", formatUsd(offer.offerUsd))
    .replace("{last}", formatUsd(offer.lastMarkUsd));
}

function isHolding(bid: Pick<IntentBid, "status">): boolean {
  return bid.status === "listed" || bid.status === "approved";
}

/** Latest reject timestamp on the panel — seat-open handoff anchor. */
export function latestRejectedAt(
  bids: readonly Pick<IntentBid, "status" | "updatedAt">[],
): string | null {
  let latest: string | null = null;
  for (const bid of bids) {
    if (bid.status !== "rejected") continue;
    if (!latest || bid.updatedAt.localeCompare(latest) > 0) {
      latest = bid.updatedAt;
    }
  }
  return latest;
}

/**
 * Next compliant outbid mark with a live offer window.
 * Highest standing first; ties → oldest createdAt. Skips banned trades.
 * On a vacant seat, expired windows cascade: the next mark’s 24h starts
 * when the prior mark’s window ended. Exhausted → null (no silent reopen).
 */
export function nextCompliantFailedWinnerMark(
  bids: readonly IntentBid[],
  input: {
    panelMinimumUsd: number;
    now?: Date;
  },
): FailedWinnerCandidate | null {
  const now = input.now ?? new Date();
  const seatOpen = !bids.some(isHolding);
  const seatOpenedAt = seatOpen ? latestRejectedAt(bids) : null;

  const candidates = bids
    .filter((bid) => bid.status === "outbid")
    .slice()
    .sort((a, b) => {
      if (b.standingUsd !== a.standingUsd) {
        return b.standingUsd - a.standingUsd;
      }
      return a.createdAt.localeCompare(b.createdAt);
    });

  let cascadeHandoffAt: string | null = seatOpenedAt;

  for (const bid of candidates) {
    if (findBannedTradeReason(bid.brandLabel, bid.tradeLabel)) continue;
    const offeredAt = seatOpen
      ? failedWinnerOfferedAt({
          bidUpdatedAt: bid.updatedAt,
          seatOpen: true,
          seatOpenedAt: cascadeHandoffAt,
        })
      : bid.updatedAt;
    if (isFailedWinnerOfferExpired(offeredAt, now)) {
      if (seatOpen) {
        cascadeHandoffAt = failedWinnerOfferExpiresAt(offeredAt);
      }
      continue;
    }
    const offer = buildFailedWinnerOffer({
      lastMarkUsd: bid.standingUsd,
      panelMinimumUsd: input.panelMinimumUsd,
      offeredAt,
      now,
    });
    return { bid, offer, offeredAt };
  }
  return null;
}

/**
 * Resolve what the signed-in viewer should see.
 * Live offer only for the exclusive next-compliant target (vacant seat) or
 * their own non-expired outbid window (occupied seat). Expired → no preferential
 * prefill; copy says offer expired / next compliant. No silent reopen.
 */
export function resolveFailedWinnerOfferForViewer(input: {
  bids: readonly IntentBid[];
  viewerId: string | null | undefined;
  panelMinimumUsd: number;
  now?: Date;
}): {
  viewerOutbid: IntentBid | null;
  offer: FailedWinnerOffer | null;
  exclusive: FailedWinnerCandidate | null;
  expiredForViewer: boolean;
} {
  const now = input.now ?? new Date();
  const exclusive = nextCompliantFailedWinnerMark(input.bids, {
    panelMinimumUsd: input.panelMinimumUsd,
    now,
  });
  const viewerId = input.viewerId;
  if (!viewerId) {
    return {
      viewerOutbid: null,
      offer: null,
      exclusive,
      expiredForViewer: false,
    };
  }

  const viewerHasActive = input.bids.some(
    (bid) => bid.userId === viewerId && isHolding(bid),
  );
  if (viewerHasActive) {
    return {
      viewerOutbid: null,
      offer: null,
      exclusive,
      expiredForViewer: false,
    };
  }

  const viewerOutbid =
    input.bids
      .filter((bid) => bid.userId === viewerId && bid.status === "outbid")
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;

  if (!viewerOutbid) {
    return {
      viewerOutbid: null,
      offer: null,
      exclusive,
      expiredForViewer: false,
    };
  }

  const seatOpen = !input.bids.some(isHolding);
  if (seatOpen) {
    if (exclusive && exclusive.bid.userId === viewerId && !exclusive.offer.expired) {
      return {
        viewerOutbid: exclusive.bid,
        offer: exclusive.offer,
        exclusive,
        expiredForViewer: false,
      };
    }
    return {
      viewerOutbid,
      offer: null,
      exclusive,
      expiredForViewer: true,
    };
  }

  const offeredAt = failedWinnerOfferedAt({
    bidUpdatedAt: viewerOutbid.updatedAt,
    seatOpen: false,
    seatOpenedAt: null,
  });
  const offer = buildFailedWinnerOffer({
    lastMarkUsd: viewerOutbid.standingUsd,
    panelMinimumUsd: input.panelMinimumUsd,
    offeredAt,
    now,
  });
  if (offer.expired) {
    return {
      viewerOutbid,
      offer: null,
      exclusive,
      expiredForViewer: true,
    };
  }
  return {
    viewerOutbid,
    offer,
    exclusive,
    expiredForViewer: false,
  };
}

/**
 * Vacant seat with a live exclusive offer: only that user may list.
 * Cascade exhausted (null exclusive) → normal listing. No silent preferential reopen.
 */
export function assertFailedWinnerExclusiveLister(input: {
  bids: readonly IntentBid[];
  userId: string;
  panelMinimumUsd: number;
  now?: Date;
}): { ok: true } | { ok: false; error: string } {
  const seatOpen = !input.bids.some(isHolding);
  if (!seatOpen) return { ok: true };
  const exclusive = nextCompliantFailedWinnerMark(input.bids, {
    panelMinimumUsd: input.panelMinimumUsd,
    now: input.now,
  });
  if (!exclusive || exclusive.offer.expired) return { ok: true };
  if (exclusive.bid.userId === input.userId) return { ok: true };
  return {
    ok: false,
    error:
      "Failed-winner offer is exclusive to the next compliant mark. No silent reopen.",
  };
}
