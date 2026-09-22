/**
 * Homepage bid desk. Money stays informational.
 * A standing winner is unpaid because no capture path exists.
 */

import { CLOSE_AT, PANELS, formatUsd } from "@/lib/campaign";
import type { IntentBid, IntentBidStatus } from "@/lib/intent";
import { isFloorSaveBid } from "@/lib/intent";
import { SEAT_LOG_TIME_ZONE, formatSeatLogTime } from "@/lib/seat-log";

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
  bidId: string;
  panelName: string;
  brandLabel: string;
  amountUsd: number;
  /** America/New_York clock, same formatter as the public seat log. */
  timeLabel: string;
  /** This row is the panel's approved mark counted in board raised. */
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

/**
 * One approved, non-floor-save mark per panel — the same dollars
 * `loadBoardIntentStats` adds into pledged / raised. If two approved
 * rows share a panel, only the max counts, once (latest `createdAt`,
 * then id). Listed and outbid rows are not in this set.
 */
function raisedBidIds(bids: readonly IntentBid[]): Set<string> {
  const byPanel = new Map<string, IntentBid[]>();
  for (const bid of bids) {
    if (bid.status !== "approved" || isFloorSaveBid(bid)) continue;
    const group = byPanel.get(bid.panelId) ?? [];
    group.push(bid);
    byPanel.set(bid.panelId, group);
  }
  const ids = new Set<string>();
  for (const group of byPanel.values()) {
    const max = Math.max(...group.map((bid) => bid.standingUsd));
    const winners = group
      .filter((bid) => bid.standingUsd === max)
      .sort((a, b) => {
        const byTime = b.createdAt.localeCompare(a.createdAt);
        if (byTime !== 0) return byTime;
        return b.id.localeCompare(a.id);
      });
    const winner = winners[0];
    if (winner) ids.add(winner.id);
  }
  return ids;
}

/**
 * Group bids that were actually entered, by Eastern calendar day.
 *
 * `bidUsd` is every public entered amount that day (listed, approved,
 * and outbid). `standingUsd` is only the approved marks that make up
 * board raised, attributed to the day each of those marks was entered.
 * Summing `standingUsd` across days equals raised. Outbid and still-listed
 * rows stay in the day total and in the line items, with standing 0.
 */
export function buildDayByDay(bids: readonly IntentBid[]): DayByDay {
  const publicBids = bids.filter(
    (bid) => HISTORY_STATUSES.has(bid.status) && !isFloorSaveBid(bid),
  );
  if (publicBids.length === 0) return EMPTY_DAY_BY_DAY;

  const standingIds = raisedBidIds(bids);
  const buckets = new Map<string, DayByDayBucket>();
  const ordered = publicBids.slice().sort((a, b) => {
    const byTime = b.createdAt.localeCompare(a.createdAt);
    if (byTime !== 0) return byTime;
    return b.id.localeCompare(a.id);
  });

  for (const bid of ordered) {
    const parts = dayParts(bid.createdAt);
    if (!parts) continue;
    const stillStanding = standingIds.has(bid.id);
    const row: DayByDayRow = {
      bidId: bid.id,
      panelName: panelName(bid.panelId),
      brandLabel: bid.brandLabel,
      amountUsd: bid.standingUsd,
      timeLabel: formatSeatLogTime(bid.createdAt),
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
