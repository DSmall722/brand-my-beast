import { formatUsd } from "./campaign";
import {
  isLiveIntentBid,
  nextStandingUsd,
  type IntentBid,
} from "./intent";
import { findBannedTradeReason } from "./banned-trades";
import { matchesBanPattern } from "./operator-ban-list";
import { PUBLIC_COPY } from "./public-copy";

export const FAILED_WINNER_OFFER_TTL_MS = 24 * 60 * 60 * 1000;

export type FailedWinnerBanRule = {
  pattern: string;
};

export type FailedWinnerOffer = {
  lastMarkUsd: number;
  offerUsd: number;
  fromLastIncrementOnly: boolean;
  expiresAt: string;
  expired: boolean;
};

export type FailedWinnerCandidate = {
  bid: IntentBid;
  offer: FailedWinnerOffer;
  offeredAt: string;
};

export function isFailedWinnerTradeBanned(
  brandLabel: string,
  tradeLabel: string,
  operatorRules: readonly FailedWinnerBanRule[] = [],
): boolean {
  if (findBannedTradeReason(brandLabel, tradeLabel)) return true;
  for (const rule of operatorRules) {
    if (matchesBanPattern(brandLabel, tradeLabel, rule.pattern)) {
      return true;
    }
  }
  return false;
}

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

function isHolding(bid: Pick<IntentBid, "status" | "deletedAt">): boolean {
  return (
    isLiveIntentBid(bid) &&
    (bid.status === "listed" || bid.status === "approved")
  );
}

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

export function nextCompliantFailedWinnerMark(
  bids: readonly IntentBid[],
  input: {
    panelMinimumUsd: number;
    now?: Date;
    operatorBanRules?: readonly FailedWinnerBanRule[];
  },
): FailedWinnerCandidate | null {
  const now = input.now ?? new Date();
  const banRules = input.operatorBanRules ?? [];
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
    if (
      isFailedWinnerTradeBanned(bid.brandLabel, bid.tradeLabel, banRules)
    ) {
      continue;
    }
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

export function resolveFailedWinnerOfferForViewer(input: {
  bids: readonly IntentBid[];
  viewerId: string | null | undefined;
  panelMinimumUsd: number;
  now?: Date;
  operatorBanRules?: readonly FailedWinnerBanRule[];
}): {
  viewerOutbid: IntentBid | null;
  offer: FailedWinnerOffer | null;
  exclusive: FailedWinnerCandidate | null;
  expiredForViewer: boolean;
} {
  const now = input.now ?? new Date();
  const banRules = input.operatorBanRules ?? [];
  const exclusive = nextCompliantFailedWinnerMark(input.bids, {
    panelMinimumUsd: input.panelMinimumUsd,
    now,
    operatorBanRules: banRules,
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

  if (
    isFailedWinnerTradeBanned(
      viewerOutbid.brandLabel,
      viewerOutbid.tradeLabel,
      banRules,
    )
  ) {
    return {
      viewerOutbid,
      offer: null,
      exclusive,
      expiredForViewer: true,
    };
  }

  const seatOpen = !input.bids.some(isHolding);
  if (seatOpen) {
    if (
      exclusive &&
      exclusive.bid.userId === viewerId &&
      !exclusive.offer.expired
    ) {
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

export function assertFailedWinnerExclusiveLister(input: {
  bids: readonly IntentBid[];
  userId: string;
  panelMinimumUsd: number;
  now?: Date;
  operatorBanRules?: readonly FailedWinnerBanRule[];
}): { ok: true } | { ok: false; error: string } {
  const seatOpen = !input.bids.some(isHolding);
  if (!seatOpen) return { ok: true };
  const exclusive = nextCompliantFailedWinnerMark(input.bids, {
    panelMinimumUsd: input.panelMinimumUsd,
    now: input.now,
    operatorBanRules: input.operatorBanRules,
  });
  if (!exclusive || exclusive.offer.expired) return { ok: true };
  if (exclusive.bid.userId === input.userId) return { ok: true };
  return {
    ok: false,
    error:
      "Failed-winner offer is exclusive to the next compliant mark. No silent reopen.",
  };
}
