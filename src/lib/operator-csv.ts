/**
 * Slice 8.4 — operator CSV of waitlist + standing intents.
 * Pure builders only. Auth lives at the route boundary.
 */

import type { IntentBid } from "./intent";
import type { WaitlistRow } from "./waitlist";

/** Standing marks = listed (pending) or approved. Not outbid / rejected / withdrawn. */
export const STANDING_INTENT_STATUSES = ["listed", "approved"] as const;

export type StandingIntentStatus = (typeof STANDING_INTENT_STATUSES)[number];

export function isStandingIntentStatus(
  status: IntentBid["status"],
): status is StandingIntentStatus {
  return (
    status === "listed" || status === "approved"
  );
}

/** RFC 4180 field escape. */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const OPERATOR_CSV_HEADERS = [
  "kind",
  "email",
  "source",
  "panel_id",
  "brand",
  "trade",
  "standing_usd",
  "deposit_usd",
  "status",
  "user_id",
  "created_at",
] as const;

export type OperatorCsvKind = "waitlist" | "intent";

export type OperatorCsvRow = {
  kind: OperatorCsvKind;
  email: string;
  source: string;
  panelId: string;
  brand: string;
  trade: string;
  standingUsd: string;
  depositUsd: string;
  status: string;
  userId: string;
  createdAt: string;
};

export function waitlistToCsvRow(row: WaitlistRow): OperatorCsvRow {
  return {
    kind: "waitlist",
    email: row.email,
    source: row.source,
    panelId: "",
    brand: "",
    trade: "",
    standingUsd: "",
    depositUsd: "",
    status: "",
    userId: row.userId ?? "",
    createdAt: row.createdAt,
  };
}

export function intentToCsvRow(bid: IntentBid): OperatorCsvRow {
  return {
    kind: "intent",
    email: "",
    source: "",
    panelId: bid.panelId,
    brand: bid.brandLabel,
    trade: bid.tradeLabel,
    standingUsd: String(bid.standingUsd),
    depositUsd: String(bid.depositUsd),
    status: bid.status,
    userId: bid.userId,
    createdAt: bid.createdAt,
  };
}

function serializeRow(row: OperatorCsvRow): string {
  return [
    row.kind,
    row.email,
    row.source,
    row.panelId,
    row.brand,
    row.trade,
    row.standingUsd,
    row.depositUsd,
    row.status,
    row.userId,
    row.createdAt,
  ]
    .map(escapeCsvField)
    .join(",");
}

/**
 * One CSV: waitlist rows first (newest already sorted by caller), then standing intents.
 */
export function buildOperatorCsv(input: {
  waitlist: WaitlistRow[];
  intents: IntentBid[];
}): string {
  const rows: OperatorCsvRow[] = [
    ...input.waitlist.map(waitlistToCsvRow),
    ...input.intents
      .filter((bid) => isStandingIntentStatus(bid.status))
      .map(intentToCsvRow),
  ];
  return [OPERATOR_CSV_HEADERS.join(","), ...rows.map(serializeRow)].join(
    "\n",
  );
}

export const OPERATOR_CSV_FILENAME = "brandmybeast-operator.csv";
export const OPERATOR_CSV_PATH = "/api/operator/csv";
