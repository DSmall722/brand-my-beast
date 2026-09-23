/**
 * Homepage bid desk. Money stays informational.
 * No card capture in this slice. The live board does not label winners unpaid.
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
  source: "live" | "sample";
  days: DayByDayBucket[];
};

const HISTORY_STATUSES = new Set<IntentBidStatus>([
  "listed",
  "approved",
  "outbid",
]);

const EMPTY_LIVE_DAY_BY_DAY: DayByDay = { source: "live", days: [] };

/**
 * Demo history only. These dollars are not written to the ledger
 * and are not pledged.
 */
const SAMPLE_DAYS: readonly {
  dayKey: string;
  dayLabel: string;
  panelId: string;
  row: DayByDayRow;
}[] = [
  {
    dayKey: "sample-standing",
    dayLabel: "2 Sep",
    panelId: "hood",
    row: {
      bidId: "sample-hood",
      panelName: "Hood",
      brandLabel: "Sample Mark",
      amountUsd: 2500,
      timeLabel: formatSeatLogTime("2026-09-02T16:00:00.000Z"),
      stillStanding: true,
    },
  },
  {
    dayKey: "sample-beaten",
    dayLabel: "1 Sep",
    panelId: "rear-bumper",
    row: {
      bidId: "sample-rear-bumper",
      panelName: "Rear bumper",
      brandLabel: "Sample Mark",
      amountUsd: 500,
      timeLabel: formatSeatLogTime("2026-09-01T16:00:00.000Z"),
      stillStanding: false,
    },
  },
];

function sampleDayByDay(panelId?: string): DayByDay {
  const days: DayByDayBucket[] = [];
  for (const sample of SAMPLE_DAYS) {
    if (panelId != null && sample.panelId !== panelId) continue;
    days.push({
      dayKey: sample.dayKey,
      dayLabel: sample.dayLabel,
      bidCount: 1,
      bidUsd: sample.row.amountUsd,
      standingUsd: sample.row.stillStanding ? sample.row.amountUsd : 0,
      rows: [sample.row],
    });
  }
  return { source: "sample", days };
}

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
 * Pass `panelId` for one seat: same math, that panel only.
 * An empty public ledger (no listed, approved, or outbid mark outside
 * a floor-save) returns the labeled sample. Sample dollars are not pledged.
 * A seat filter applies after that check, so one empty panel does not
 * invent sample rows while another panel has a real mark.
 */
export function buildDayByDay(
  bids: readonly IntentBid[],
  options?: { panelId?: string },
): DayByDay {
  const publicLedger = bids.filter(
    (bid) => HISTORY_STATUSES.has(bid.status) && !isFloorSaveBid(bid),
  );
  if (publicLedger.length === 0) return sampleDayByDay(options?.panelId);

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
