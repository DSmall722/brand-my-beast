/**
 * Campaign clock and deposit settlement. Pure. No Stripe client.
 * Open and close are America/New_York wall times stored as UTC instants.
 */

import { CLOSE_AT, FLOOR_USD, OPEN_AT } from "./campaign";
import { formatCampaignInstantEt, formatSeatLogTime } from "./seat-log";
import {
  depositRefundStatus,
  hasPaidDeposit,
  type DepositRefundStatus,
  type IntentBid,
} from "./intent";

export const SOFT_CLOSE_MS = 10 * 60 * 1000;
export const WINNER_PAY_MS = 7 * 24 * 60 * 60 * 1000;

export type CampaignPhaseKind = "flag_off" | "before_open" | "open" | "closed";

export type CampaignPhase = {
  kind: CampaignPhaseKind;
  openAt: string;
  closeAt: string;
  effectiveCloseAt: string;
};

export function lockedOpenAt(): string {
  return OPEN_AT;
}

export function lockedCloseAt(): string {
  if (!CLOSE_AT) {
    throw new Error("CLOSE_AT is required for the campaign window.");
  }
  return CLOSE_AT;
}

/** Published close as an Eastern wall time. Resolved through America/New_York. */
export function publishedCloseLabelEt(): string {
  return formatCampaignInstantEt(lockedCloseAt());
}

/**
 * Each accepted bid in the last 10 minutes of the current close
 * pushes that close back by 10 minutes. Each bid extends at most once.
 */
export function effectiveCloseMs(
  closeAtIso: string,
  bidTimesIso: readonly string[],
): number {
  let close = Date.parse(closeAtIso);
  if (!Number.isFinite(close)) {
    throw new Error("closeAt must be an ISO timestamp.");
  }
  const times = bidTimesIso
    .map((iso) => Date.parse(iso))
    .filter((ms) => Number.isFinite(ms))
    .sort((a, b) => a - b);
  for (const t of times) {
    if (t >= close - SOFT_CLOSE_MS && t < close) {
      close += SOFT_CLOSE_MS;
    }
  }
  return close;
}

export function campaignPhase(input: {
  nowMs: number;
  liveBidding: boolean;
  previewOpen: boolean;
  openAt?: string;
  closeAt?: string;
  bidTimes?: readonly string[];
}): CampaignPhase {
  const openAt = input.openAt ?? lockedOpenAt();
  const closeAt = input.closeAt ?? lockedCloseAt();
  const effective = new Date(
    effectiveCloseMs(closeAt, input.bidTimes ?? []),
  ).toISOString();
  const openMs = Date.parse(openAt);
  const closeMs = Date.parse(effective);
  const base = { openAt, closeAt, effectiveCloseAt: effective };
  const deskOn = input.liveBidding || input.previewOpen;
  if (!deskOn) return { kind: "flag_off", ...base };
  if (input.previewOpen && input.nowMs < closeMs) {
    return { kind: "open", ...base };
  }
  if (input.nowMs < openMs) return { kind: "before_open", ...base };
  if (input.nowMs < closeMs) return { kind: "open", ...base };
  return { kind: "closed", ...base };
}

export function campaignWindowSentence(phase: CampaignPhase): string {
  const open = formatSeatLogTime(phase.openAt);
  const close = formatSeatLogTime(phase.effectiveCloseAt);
  switch (phase.kind) {
    case "open":
      return `Bidding is open. Closes ${close}. A bid in the last 10 minutes pushes the close back 10 minutes.`;
    case "closed":
      return `Bidding closed ${close}.`;
    case "before_open":
      return `Bidding opens ${open}. Closes ${close}.`;
    case "flag_off":
      return `Opens ${open}. Closes ${close}.`;
    default: {
      const unreachable: never = phase.kind;
      return unreachable;
    }
  }
}

export function depositDueUsd(obligationUsd: number, creditUsd: number): number {
  const due = obligationUsd - creditUsd;
  if (!Number.isFinite(due)) return obligationUsd;
  return Math.max(0, due);
}

export function priorCapturedCreditUsd(
  bids: readonly IntentBid[],
  userId: string,
  panelId: string,
): number {
  let sum = 0;
  for (const bid of bids) {
    if (bid.userId !== userId || bid.panelId !== panelId) continue;
    if (!hasPaidDeposit(bid)) continue;
    if (depositRefundStatus(bid) !== "none") continue;
    sum += bid.capturedUsd ?? bid.depositUsd;
  }
  return sum;
}

export type SettleAction =
  | { kind: "refund"; bidId: string; paymentId: string | null }
  | { kind: "forfeit"; bidId: string }
  | { kind: "credit"; bidId: string; remainderDueAt: string };

function eligiblePaid(bids: readonly IntentBid[], panelId: string): IntentBid[] {
  return bids
    .filter(
      (bid) =>
        bid.panelId === panelId &&
        hasPaidDeposit(bid) &&
        depositRefundStatus(bid) === "none" &&
        bid.status !== "withdrawn" &&
        bid.status !== "rejected" &&
        bid.floorSaveUsd == null,
    )
    .sort((a, b) => {
      if (b.standingUsd !== a.standingUsd) return b.standingUsd - a.standingUsd;
      return a.createdAt.localeCompare(b.createdAt);
    });
}

function panelIds(bids: readonly IntentBid[]): string[] {
  return [...new Set(bids.map((bid) => bid.panelId))];
}

/**
 * After the effective close, losers are refunded, the winner's deposit is
 * credited to the invoice, and a winner who misses the 7-day remainder
 * forfeits. The next paid bidder is held until that deadline passes.
 * Under the $58,000 floor, every paid deposit is refunded.
 */
export function planSettlement(
  bids: readonly IntentBid[],
  nowMs: number,
  effectiveCloseMsValue: number,
): SettleAction[] {
  if (nowMs < effectiveCloseMsValue) return [];
  const actions: SettleAction[] = [];
  let raised = 0;
  for (const panelId of panelIds(bids)) {
    const top = eligiblePaid(bids, panelId)[0];
    if (top) raised += top.standingUsd;
  }
  if (raised < FLOOR_USD) {
    for (const panelId of panelIds(bids)) {
      refundFrom(actions, eligiblePaid(bids, panelId));
    }
    return actions;
  }

  for (const panelId of panelIds(bids)) {
    let ranked = eligiblePaid(bids, panelId);
    const originalTop = ranked[0];
    if (!originalTop) continue;
    const dueMs = originalTop.remainderDueAt
      ? Date.parse(originalTop.remainderDueAt)
      : null;
    const forfeited =
      Boolean(originalTop.invoiceCreditedAt) &&
      dueMs != null &&
      Number.isFinite(dueMs) &&
      !originalTop.remainderPaidAt &&
      nowMs >= dueMs;
    if (forfeited) {
      actions.push({ kind: "forfeit", bidId: originalTop.id });
      ranked = ranked.slice(1);
    }
    const winner = ranked[0];
    if (!winner) continue;
    if (!winner.invoiceCreditedAt) {
      const due = forfeited
        ? nowMs + WINNER_PAY_MS
        : effectiveCloseMsValue + WINNER_PAY_MS;
      actions.push({
        kind: "credit",
        bidId: winner.id,
        remainderDueAt: new Date(due).toISOString(),
      });
    }
    const successor = ranked[1];
    const keep = new Set<string>([winner.id]);
    if (successor && !winner.remainderPaidAt) keep.add(successor.id);
    refundFrom(
      actions,
      ranked.filter((bid) => !keep.has(bid.id)),
    );
  }
  return actions;
}

function refundFrom(actions: SettleAction[], bids: readonly IntentBid[]): void {
  for (const bid of bids) {
    if (depositRefundStatus(bid) !== "none") continue;
    actions.push({
      kind: "refund",
      bidId: bid.id,
      paymentId: bid.paymentId ?? null,
    });
  }
}

export function remainderUsd(standingUsd: number, capturedSumUsd: number): number {
  return Math.max(0, standingUsd - capturedSumUsd);
}

export type { DepositRefundStatus };
