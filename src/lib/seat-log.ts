import { formatUsd } from "./campaign";
import {
  hasPaidDeposit,
  isFloorSaveBid,
  isLiveIntentBid,
  type IntentBid,
} from "./intent";
import { panelBoardMarkFor, panelLegendLabel } from "./panel-board";

export const SEAT_LOG_TIME_ZONE = "America/New_York" as const;

export type PublicSeatLogEntry = {
  bidId: string;
  amountUsd: number;
  amountLabel: string;
  createdAt: string;
  timeLabel: string;
  panelNumber: number;
  panelNumberLabel: string;
  brandLabel: string;
  status: IntentBid["status"];
};

export function formatSeatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: SEAT_LOG_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
  return `${formatted} ET`;
}

export function formatCampaignInstantEt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SEAT_LOG_TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("weekday")} ${pick("month")} ${pick("day")}, ${pick("year")}, ${pick("hour")}:${pick("minute")} ${pick("dayPeriod")} ET`;
}

const PUBLIC_LOG_STATUSES = new Set<IntentBid["status"]>([
  "listed",
  "approved",
  "outbid",
]);

export function buildPublicSeatLog(
  bids: readonly IntentBid[],
): PublicSeatLogEntry[] {
  return bids
    .filter(
      (bid) =>
        isLiveIntentBid(bid) &&
        hasPaidDeposit(bid) &&
        PUBLIC_LOG_STATUSES.has(bid.status) &&
        !isFloorSaveBid(bid),
    )
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((bid) => {
      const mark = panelBoardMarkFor(bid.panelId);
      return {
        bidId: bid.id,
        amountUsd: bid.standingUsd,
        amountLabel: formatUsd(bid.standingUsd),
        createdAt: bid.createdAt,
        timeLabel: formatSeatLogTime(bid.createdAt),
        panelNumber: mark.n,
        panelNumberLabel: panelLegendLabel(mark),
        brandLabel: bid.brandLabel,
        status: bid.status,
      };
    });
}
