/**
 * Slice 14.42 — counsel export: CONTRACT.md + standing table ZIP.
 * No emails / userIds in the ZIP. Operator-gated. Not a charge path.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { IntentBid } from "./intent";
import { escapeCsvField } from "./operator-csv";
import { buildStoreZip } from "./store-zip";

export const COUNSEL_ZIP_FILENAME = "brandmybeast-counsel.zip";
export const COUNSEL_ZIP_PATH = "/api/operator/counsel-zip";
export const COUNSEL_CONTRACT_ENTRY = "CONTRACT.md";
export const COUNSEL_STANDING_ENTRY = "standing-table.csv";

export const COUNSEL_STANDING_HEADERS = [
  "panel_id",
  "brand",
  "trade",
  "standing_usd",
  "status",
  "bid_id",
] as const;

/** Standing row with no email / userId columns. */
export function standingBidToCounselRow(bid: IntentBid): string[] {
  return [
    bid.panelId,
    bid.brandLabel,
    bid.tradeLabel,
    String(bid.standingUsd),
    bid.status,
    bid.id,
  ];
}

export function buildCounselStandingCsv(
  bids: readonly IntentBid[],
): string {
  const lines = [
    COUNSEL_STANDING_HEADERS.join(","),
    ...bids.map((bid) =>
      standingBidToCounselRow(bid).map(escapeCsvField).join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

/** True when the CSV blob contains an email-like token or userId column. */
export function counselStandingHasEmailLeak(csv: string): boolean {
  const lower = csv.toLowerCase();
  if (lower.includes("user_id") || lower.includes("userid")) return true;
  if (lower.includes("email")) return true;
  // Angle / bare email shapes.
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(csv)) return true;
  return false;
}

export function readContractMarkdown(
  root: string = process.cwd(),
): string {
  return readFileSync(join(root, "CONTRACT.md"), "utf8");
}

export function buildCounselZip(input: {
  contractMarkdown: string;
  standingBids: readonly IntentBid[];
}): Buffer {
  const standingCsv = buildCounselStandingCsv(input.standingBids);
  if (counselStandingHasEmailLeak(standingCsv)) {
    throw new Error("Counsel standing table must not include emails.");
  }
  if (/@gmail\.com/i.test(input.contractMarkdown)) {
    throw new Error("CONTRACT.md must not include personal Gmail.");
  }

  return buildStoreZip([
    { name: COUNSEL_CONTRACT_ENTRY, data: input.contractMarkdown },
    { name: COUNSEL_STANDING_ENTRY, data: standingCsv },
  ]);
}
