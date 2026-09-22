import { PANELS } from "@/lib/campaign";
import type { IntentBid, IntentBidStatus } from "@/lib/intent";
import { isFloorSaveBid } from "@/lib/intent";
import { publicLogoUrl } from "@/lib/public-mark";
import { SEAT_LOG_TIME_ZONE, formatSeatLogTime } from "@/lib/seat-log";

const PUBLIC_STATUSES = new Set<IntentBidStatus>([
  "listed",
  "approved",
  "outbid",
]);

export type StandingMark = {
  bidId: string;
  panelId: string;
  panelName: string;
  brandLabel: string;
  standingUsd: number;
  publicLogoUrl: string | null;
};

export type TodayMark = StandingMark & {
  timeLabel: string;
};

export type AuctionLive = {
  top: StandingMark[];
  today: TodayMark[];
};

export type LeaderboardRow = StandingMark & {
  rank: number;
  dayLabel: string;
};

export type Leaderboard = {
  bidCount: number;
  brandCount: number;
  rows: LeaderboardRow[];
};

function panelName(panelId: string): string {
  return PANELS.find((panel) => panel.id === panelId)?.name ?? panelId;
}

function publicBids(bids: readonly IntentBid[]): IntentBid[] {
  return bids.filter(
    (bid) => PUBLIC_STATUSES.has(bid.status) && !isFloorSaveBid(bid),
  );
}

function toStanding(bid: IntentBid): StandingMark {
  return {
    bidId: bid.id,
    panelId: bid.panelId,
    panelName: panelName(bid.panelId),
    brandLabel: bid.brandLabel,
    standingUsd: bid.standingUsd,
    publicLogoUrl: publicLogoUrl(bid),
  };
}

function etDayKey(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEAT_LOG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function etDayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: SEAT_LOG_TIME_ZONE,
    day: "numeric",
    month: "short",
  }).format(date);
}

/** Current holder per panel: highest listed or approved mark, not floor-save. */
function standingBids(bids: readonly IntentBid[]): IntentBid[] {
  const byPanel = new Map<string, IntentBid>();
  for (const bid of publicBids(bids)) {
    if (bid.status !== "listed" && bid.status !== "approved") continue;
    const current = byPanel.get(bid.panelId);
    if (!current || bid.standingUsd > current.standingUsd) {
      byPanel.set(bid.panelId, bid);
      continue;
    }
    if (
      bid.standingUsd === current.standingUsd &&
      bid.createdAt > current.createdAt
    ) {
      byPanel.set(bid.panelId, bid);
    }
  }
  return [...byPanel.values()].sort((a, b) => {
    const byMoney = b.standingUsd - a.standingUsd;
    if (byMoney !== 0) return byMoney;
    return a.panelId.localeCompare(b.panelId);
  });
}

/** Top standing marks and the bids entered today (Eastern). */
export function buildAuctionLive(
  bids: readonly IntentBid[],
  now: Date = new Date(),
): AuctionLive {
  const top = standingBids(bids).slice(0, 3).map(toStanding);
  const todayKey = etDayKey(now.toISOString());
  const today = publicBids(bids)
    .filter((bid) => etDayKey(bid.createdAt) === todayKey)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((bid) => ({
      ...toStanding(bid),
      timeLabel: formatSeatLogTime(bid.createdAt),
    }));
  return { top, today };
}

/** Every public bid, highest first. Outbid rows stay. */
export function buildLeaderboard(bids: readonly IntentBid[]): Leaderboard {
  const rows = publicBids(bids)
    .slice()
    .sort((a, b) => {
      const byMoney = b.standingUsd - a.standingUsd;
      if (byMoney !== 0) return byMoney;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .map((bid, index) => ({
      ...toStanding(bid),
      rank: index + 1,
      dayLabel: etDayLabel(bid.createdAt),
    }));
  const brands = new Set(
    rows.map((row) => row.brandLabel.trim().toLowerCase()),
  );
  return {
    bidCount: rows.length,
    brandCount: brands.size,
    rows,
  };
}
