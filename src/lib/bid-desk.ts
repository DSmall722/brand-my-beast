/**
 * Homepage bid desk. Money stays informational.
 * A standing winner is unpaid because no capture path exists.
 */

import { CLOSE_AT, PANELS, formatUsd } from "@/lib/campaign";
import type { IntentBid, IntentBidStatus } from "@/lib/intent";
import { isFloorSaveBid } from "@/lib/intent";
import { SEAT_LOG_TIME_ZONE } from "@/lib/seat-log";

export type BidDeskMode = { kind: "closed" } | { kind: "intent" };

/** Clock unset means the public desk explains that bidding is not open. */
export function bidDeskMode(closeAt: string | null = CLOSE_AT): BidDeskMode {
  if (closeAt === null) return { kind: "closed" };
  return { kind: "intent" };
}

/** No Stripe capture in this slice. A standing winner has not paid. */
export const STANDING_WINNER_PAYMENT = "unpaid" as const;

export type StandingWinnerPayment = typeof STANDING_WINNER_PAYMENT;

export type BidPanelQuote = {
  id: string;
  name: string;
  currentBidUsd: number;
  minimumBidUsd: number;
};

export type DayByDayRow = {
  panelName: string;
  brandLabel: string;
  amountUsd: number;
  stillStanding: boolean;
};

export type DayByDayBucket = {
  dayKey: string;
  dayLabel: string;
  bidCount: number;
  bidUsd: number;
  standingUsd: number;
  rows: DayByDayRow[];
};

export type DayByDay = {
  days: DayByDayBucket[];
};

const HISTORY_STATUSES = new Set<IntentBidStatus>([
  "listed",
  "approved",
  "outbid",
]);

const EMPTY_DAY_BY_DAY: DayByDay = { days: [] };

function panelName(panelId: string): string {
  return PANELS.find((panel) => panel.id === panelId)?.name ?? panelId;
}

function dayParts(iso: string): { dayKey: string; dayLabel: string } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEAT_LOG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: SEAT_LOG_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(date);
  return { dayKey, dayLabel };
}

function topActiveUsd(
  bids: readonly IntentBid[],
  panelId: string,
): number | null {
  const active = bids.filter(
    (bid) =>
      bid.panelId === panelId &&
      (bid.status === "listed" || bid.status === "approved") &&
      !isFloorSaveBid(bid),
  );
  if (active.length === 0) return null;
  return Math.max(...active.map((bid) => bid.standingUsd));
}

/** Group bids that were actually entered, by Eastern calendar day. */
export function buildDayByDay(bids: readonly IntentBid[]): DayByDay {
  const publicBids = bids.filter(
    (bid) => HISTORY_STATUSES.has(bid.status) && !isFloorSaveBid(bid),
  );
  if (publicBids.length === 0) return EMPTY_DAY_BY_DAY;

  const buckets = new Map<string, DayByDayBucket>();
  for (const bid of publicBids) {
    const parts = dayParts(bid.createdAt);
    if (!parts) continue;
    const top = topActiveUsd(publicBids, bid.panelId);
    const stillStanding =
      top != null &&
      (bid.status === "listed" || bid.status === "approved") &&
      bid.standingUsd === top;
    const row: DayByDayRow = {
      panelName: panelName(bid.panelId),
      brandLabel: bid.brandLabel,
      amountUsd: bid.standingUsd,
      stillStanding,
    };
    const existing = buckets.get(parts.dayKey);
    if (!existing) {
      buckets.set(parts.dayKey, {
        dayKey: parts.dayKey,
        dayLabel: parts.dayLabel,
        bidCount: 1,
        bidUsd: bid.standingUsd,
        standingUsd: stillStanding ? bid.standingUsd : 0,
        rows: [row],
      });
      continue;
    }
    existing.bidCount += 1;
    existing.bidUsd += bid.standingUsd;
    if (stillStanding) existing.standingUsd += bid.standingUsd;
    existing.rows.push(row);
  }

  const days = [...buckets.values()].sort((a, b) =>
    b.dayKey.localeCompare(a.dayKey),
  );
  if (days.length === 0) return EMPTY_DAY_BY_DAY;
  return { days };
}

export function formatDayMoney(amountUsd: number): string {
  return formatUsd(amountUsd);
}
