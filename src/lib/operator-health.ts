/**
 * Slice 13.45 — operator health snapshot: waitlist + pending + last digest.
 * Builds on 11.5 / 12.42. No Stripe. Does not set CLOSE_AT.
 */

import { listBidsPendingApproval } from "@/lib/intent-store";
import {
  getLastOperatorDigestAt,
  type OperatorDbPing,
  loadOperatorStatus,
} from "@/lib/operator-status";

export type OperatorHealthSnapshot = {
  db: OperatorDbPing;
  waitlistCount: number;
  pendingCount: number;
  lastDigestAt: string | null;
};

export function formatPendingCountLabel(count: number): string {
  if (count === 0) return "0 pending";
  return `${count} pending`;
}

export function formatLastDigestLabel(iso: string | null): string {
  if (!iso) return "never";
  return iso;
}

/**
 * Slice 16.35 — show SEATS_OPEN when 14.17 exists. Do not flip it.
 * Missing module prints `unset`.
 */
export function formatHealthSeatsOpen(
  modulePresent: boolean,
  seatsOpen: boolean,
): string {
  if (!modulePresent) return "unset";
  return seatsOpen ? "true" : "false";
}

export async function loadOperatorHealthSnapshot(
  env: NodeJS.ProcessEnv = process.env,
): Promise<OperatorHealthSnapshot> {
  const [status, pending] = await Promise.all([
    loadOperatorStatus(env),
    listBidsPendingApproval(),
  ]);
  return {
    db: status.db,
    waitlistCount: status.waitlistCount,
    pendingCount: pending.length,
    lastDigestAt: getLastOperatorDigestAt(),
  };
}
