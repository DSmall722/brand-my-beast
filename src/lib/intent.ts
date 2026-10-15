import { DEPOSIT_PERCENT, FLOOR_USD, PROXY_MAX_CAP_USD, type Panel } from "./campaign";

export type UserId = string;

export type IntentBidStatus =
  | "listed"
  | "outbid"
  | "withdrawn"
  | "approved"
  | "rejected";

export type DepositRefundStatus = "none" | "refunded" | "forfeited";

export type IntentBid = {
  id: string;
  panelId: Panel["id"];
  userId: UserId;
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
  depositUsd: number;
  status: IntentBidStatus;
  createdAt: string;
  updatedAt: string;
  idempotencyKey: string | null;
  artworkUrl: string | null;
  artworkApproval?: "pending" | "approved" | null;
  proxyMaxUsd: number | null;
  floorSaveUsd: number | null;
  deletedAt: string | null;
  depositPaidAt?: string | null;
  paymentId?: string | null;
  refundStatus?: DepositRefundStatus;
  capturedUsd?: number;
  creditUsd?: number;
  checkoutSessionId?: string | null;
  remainderDueAt?: string | null;
  remainderPaidAt?: string | null;
  invoiceCreditedAt?: string | null;
};

export function isLiveIntentBid(bid: { deletedAt?: string | null }): boolean {
  return bid.deletedAt == null || bid.deletedAt === "";
}

export function activeStandingUsd(
  bids: readonly (Pick<IntentBid, "status" | "standingUsd" | "floorSaveUsd"> & {
    deletedAt?: string | null;
  })[],
  openingUsd: number,
): number {
  const active = bids.filter(
    (bid) =>
      isLiveIntentBid(bid) &&
      (bid.status === "listed" || bid.status === "approved") &&
      !isFloorSaveBid(bid),
  );
  if (active.length === 0) return openingUsd;
  return Math.max(...active.map((bid) => bid.standingUsd));
}

export function isFloorSaveBid(bid: Pick<IntentBid, "floorSaveUsd">): boolean {
  return bid.floorSaveUsd != null;
}

export function hasPaidDeposit(bid: { depositPaidAt?: string | null }): boolean {
  const paidAt = bid.depositPaidAt;
  return typeof paidAt === "string" && paidAt.length > 0;
}

export function depositRefundStatus(bid: {
  refundStatus?: DepositRefundStatus | null;
}): DepositRefundStatus {
  if (bid.refundStatus === "refunded" || bid.refundStatus === "forfeited") {
    return bid.refundStatus;
  }
  return "none";
}

export function countsAsPublicStanding(
  bid: Pick<IntentBid, "status" | "floorSaveUsd"> & {
    depositPaidAt?: string | null;
    refundStatus?: DepositRefundStatus | null;
    deletedAt?: string | null;
  },
): boolean {
  if (!isLiveIntentBid(bid)) return false;
  if (isFloorSaveBid(bid) || !hasPaidDeposit(bid)) return false;
  if (depositRefundStatus(bid) !== "none") return false;
  return bid.status === "listed" || bid.status === "approved";
}

export function isPendingPublicBid(
  bid: Pick<IntentBid, "status" | "floorSaveUsd"> & {
    depositPaidAt?: string | null;
    refundStatus?: DepositRefundStatus | null;
    deletedAt?: string | null;
  },
): boolean {
  if (!isLiveIntentBid(bid)) return false;
  if (depositRefundStatus(bid) !== "none") return false;
  if (isFloorSaveBid(bid) || countsAsPublicStanding(bid)) return false;
  switch (bid.status) {
    case "listed":
    case "approved":
      return true;
    case "outbid":
    case "withdrawn":
    case "rejected":
      return false;
    default: {
      const unreachable: never = bid.status;
      return unreachable;
    }
  }
}

export function pledgedUsdForPanel(
  bids: readonly (Pick<IntentBid, "status" | "standingUsd" | "floorSaveUsd"> & {
    depositPaidAt?: string | null;
    refundStatus?: DepositRefundStatus | null;
  })[],
): number {
  const standing = bids.filter(countsAsPublicStanding);
  if (standing.length === 0) return 0;
  return Math.max(...standing.map((bid) => bid.standingUsd));
}

export function isCampaignShortOfFloor(pledgedUsd: number): boolean {
  return Number.isFinite(pledgedUsd) && pledgedUsd < FLOOR_USD;
}

export function canFireFloorSave(pledgedUsd: number): boolean {
  return isCampaignShortOfFloor(pledgedUsd);
}

export function normalizeTradeLabel(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

export function minIncrementUsd(standingUsd: number): number {
  if (
    !Number.isFinite(standingUsd) ||
    !Number.isInteger(standingUsd) ||
    standingUsd < 0
  ) {
    throw new Error("standingUsd must be a non-negative integer dollar amount");
  }
  return Math.max(250, Math.ceil(standingUsd * 0.1));
}

export function nextStandingUsd(currentStandingUsd: number): number {
  const next = currentStandingUsd + minIncrementUsd(currentStandingUsd);
  if (!Number.isInteger(next)) {
    throw new Error("next minimum must be an integer dollar amount");
  }
  return next;
}

export function parseProxyMaxUsd(
  raw: unknown,
  standingUsd: number,
): { ok: true; proxyMaxUsd: number | null } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, proxyMaxUsd: null };
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      error: "Proxy max must be a whole dollar amount.",
    };
  }
  if (!Number.isFinite(standingUsd) || standingUsd <= 0) {
    return { ok: false, error: "Intent mark must be set before proxy max." };
  }
  if (value < standingUsd) {
    return {
      ok: false,
      error: "Proxy max must be at least the intent mark.",
    };
  }
  if (value > PROXY_MAX_CAP_USD) {
    return {
      ok: false,
      error: `Proxy max cannot exceed $${PROXY_MAX_CAP_USD.toLocaleString("en-US")} (buyout cap).`,
    };
  }
  return { ok: true, proxyMaxUsd: value };
}

export function parseFloorSaveUsd(
  raw: unknown,
): { ok: true; floorSaveUsd: number } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: false, error: "Floor-save mark Y is required." };
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      error: "Floor-save mark must be a whole dollar amount.",
    };
  }
  return { ok: true, floorSaveUsd: value };
}

export function parseStandingUsd(
  raw: unknown,
): { ok: true; standingUsd: number | undefined } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, standingUsd: undefined };
  }
  const value = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    return {
      ok: false,
      error: "Standing mark must be a whole dollar amount.",
    };
  }
  return { ok: true, standingUsd: value };
}

export function depositUsdForMark(markUsd: number): number {
  if (!Number.isFinite(markUsd) || markUsd <= 0) {
    throw new Error("markUsd must be a positive finite number");
  }
  return Math.round(markUsd * (DEPOSIT_PERCENT / 100));
}

export function assertIntentOnly(bid: IntentBid): void {
  const forbidden = bid as IntentBid & {
    stripePaymentMethodId?: unknown;
    capturedAt?: unknown;
    setupIntentId?: unknown;
  };
  if (
    forbidden.stripePaymentMethodId != null ||
    forbidden.capturedAt != null ||
    forbidden.setupIntentId != null
  ) {
    throw new Error("P2 IntentBid must not carry Stripe capture fields");
  }
}

export const INTENT_STALE_WRITE = "stale_write" as const;
export type IntentWriteErrorCode = typeof INTENT_STALE_WRITE;

export function isStaleWriteError(result: {
  ok: boolean;
  code?: string;
  error?: string;
}): result is { ok: false; code: typeof INTENT_STALE_WRITE; error: string } {
  return result.ok === false && result.code === INTENT_STALE_WRITE;
}

export function parseIdempotencyKey(
  raw: unknown,
): { ok: true; idempotencyKey: string | null } | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: true, idempotencyKey: null };
  }
  const value = String(raw).trim();
  if (value.length < 8 || value.length > 128) {
    return {
      ok: false,
      error: "Idempotency key must be 8–128 characters.",
    };
  }
  if (/\s/.test(value)) {
    return { ok: false, error: "Idempotency key must not contain spaces." };
  }
  return { ok: true, idempotencyKey: value };
}
