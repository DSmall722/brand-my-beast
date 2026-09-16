/**
 * Slice 12.15 — account export JSON payload.
 * Pure builder. Auth lives at the route boundary.
 */

import { BRAND } from "./campaign";
import type { IntentBid } from "./intent";
import type { WaitlistRow } from "./waitlist";

export const ACCOUNT_EXPORT_PATH = "/api/account/export";
export const ACCOUNT_EXPORT_FILENAME = "brandmybeast-account.json";

/** Waitlist fields safe to hand back to the account holder (no confirm token). */
export type AccountExportWaitlist = {
  email: string;
  createdAt: string;
  source: string;
  confirmedAt: string | null;
};

export type AccountExportIntent = {
  id: string;
  panelId: string;
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
  depositUsd: number;
  status: IntentBid["status"];
  createdAt: string;
  updatedAt: string;
  artworkUrl: string | null;
  proxyMaxUsd: number | null;
  floorSaveUsd: number | null;
  deletedAt: string | null;
};

export type AccountExportPayload = {
  brand: string;
  exportedAt: string;
  intentOnly: true;
  closeAt: null;
  account: {
    email: string;
    userId: string;
  };
  waitlist: AccountExportWaitlist | null;
  intents: AccountExportIntent[];
};

export function waitlistToExportRow(
  row: WaitlistRow,
): AccountExportWaitlist {
  return {
    email: row.email,
    createdAt: row.createdAt,
    source: row.source,
    confirmedAt: row.confirmedAt,
  };
}

export function intentToExportRow(bid: IntentBid): AccountExportIntent {
  return {
    id: bid.id,
    panelId: bid.panelId,
    brandLabel: bid.brandLabel,
    tradeLabel: bid.tradeLabel,
    standingUsd: bid.standingUsd,
    depositUsd: bid.depositUsd,
    status: bid.status,
    createdAt: bid.createdAt,
    updatedAt: bid.updatedAt,
    artworkUrl: bid.artworkUrl,
    proxyMaxUsd: bid.proxyMaxUsd,
    floorSaveUsd: bid.floorSaveUsd,
    deletedAt: bid.deletedAt,
  };
}

export function buildAccountExport(input: {
  email: string;
  userId: string;
  waitlist: WaitlistRow | null;
  intents: IntentBid[];
  exportedAt?: string;
}): AccountExportPayload {
  return {
    brand: BRAND.name,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    intentOnly: true,
    closeAt: null,
    account: {
      email: input.email,
      userId: input.userId,
    },
    waitlist: input.waitlist ? waitlistToExportRow(input.waitlist) : null,
    intents: input.intents.map(intentToExportRow),
  };
}

export function accountExportJson(payload: AccountExportPayload): string {
  return `${JSON.stringify(payload, null, 2)}\n`;
}
