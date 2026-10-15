import { CLOSE_AT, PANELS, formatUsd } from "@/lib/campaign";
import { depositDeskOpen } from "@/lib/campaign-clock";
import type { IntentBid, IntentBidStatus } from "@/lib/intent";
import {
  countsAsPublicStanding,
  hasPaidDeposit,
  isFloorSaveBid,
  isLiveIntentBid,
} from "@/lib/intent";
import { SEAT_LOG_TIME_ZONE, formatSeatLogTime } from "@/lib/seat-log";

export type BidDeskMode = { kind: "closed" } | { kind: "intent" };

export function bidDeskMode(
  closeAt: string | null = CLOSE_AT,
  bidTimes: readonly string[] = [],
): BidDeskMode {
  if (closeAt === null) return { kind: "closed" };
  if (!depositDeskOpen(bidTimes)) return { kind: "closed" };
  return { kind: "intent" };
}

export type BidPanelQuote = {
  id: string;
  name: string;
  currentBidUsd: number;
  minimumBidUsd: number;
  hasStanding: boolean;
};

export type DayByDayRow = {
  bidId: string;
  panelName: string;
  brandLabel: string;
  amountUsd: number;
  timeLabel: string;
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
  source: "live" | "sample";
  days: DayByDayBucket[];
};

const HISTORY_STATUSES = new Set<IntentBidStatus>([
  "listed",
  "approved",
  "outbid",
]);

const EMPTY_LIVE_DAY_BY_DAY: DayByDay = { source: "live", days: [] };

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

function raisedBidIds(bids: readonly IntentBid[]): Set<string> {
  const byPanel = new Map<string, IntentBid[]>();
  for (const bid of bids) {
    if (!countsAsPublicStanding(bid)) continue;
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

export function buildDayByDay(
  bids: readonly IntentBid[],
  options?: { panelId?: string },
): DayByDay {
  const publicLedger = bids.filter(
    (bid) =>
      isLiveIntentBid(bid) &&
      HISTORY_STATUSES.has(bid.status) &&
      !isFloorSaveBid(bid) &&
      hasPaidDeposit(bid),
  );
  if (publicLedger.length === 0) return EMPTY_LIVE_DAY_BY_DAY;

  const scoped =
    options?.panelId == null
      ? publicLedger
      : publicLedger.filter((bid) => bid.panelId === options.panelId);
  const publicBids = scoped;
  if (publicBids.length === 0) return EMPTY_LIVE_DAY_BY_DAY;

  const standingIds = raisedBidIds(scoped);
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
  if (days.length === 0) return EMPTY_LIVE_DAY_BY_DAY;
  return { source: "live", days };
}

export function formatDayMoney(amountUsd: number): string {
  return formatUsd(amountUsd);
}
