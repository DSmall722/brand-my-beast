import { formatUsd } from "./campaign";
import type { IntentBid } from "./intent";
import { intentStatusLabel } from "./intent-labels";
import { panelBoardMarkFor } from "./panel-board";

/**
 * Slice 16.22 — operator list columns. Same order on every intent row.
 * Amount is formatUsd of the standing mark. No third money number.
 */
export const OPERATOR_LIST_COLUMN_KEYS = [
  "#",
  "panel",
  "brand",
  "trade",
  "amount",
  "status",
] as const;

export type OperatorListColumnKey = (typeof OPERATOR_LIST_COLUMN_KEYS)[number];

export type OperatorListColumn = {
  key: OperatorListColumnKey;
  value: string;
};

export function operatorListColumns(
  bid: Pick<
    IntentBid,
    "panelId" | "brandLabel" | "tradeLabel" | "standingUsd" | "status"
  >,
): OperatorListColumn[] {
  const mark = panelBoardMarkFor(bid.panelId);
  const values: Record<OperatorListColumnKey, string> = {
    "#": String(mark.n),
    panel: mark.name,
    brand: bid.brandLabel,
    trade: bid.tradeLabel,
    amount: formatUsd(bid.standingUsd),
    status: intentStatusLabel(bid.status),
  };
  return OPERATOR_LIST_COLUMN_KEYS.map((key) => ({
    key,
    value: values[key],
  }));
}
