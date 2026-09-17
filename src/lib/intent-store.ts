/**
 * Intent bid ledger — memory (CI/local) or Postgres (DATABASE_URL).
 * Intent only — never stores Stripe/capture fields. See P2.md.
 */

import { and, asc, desc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import {
  assertLedgerArtworkUrl,
  persistArtworkForLedger,
  resetArtworkBlobStoreForTests,
} from "./artwork-blob";
import { anonymizedUserId, isAnonymizedUserId } from "./account-delete";
import { GOAL_USD, PANELS, type Panel } from "./campaign";
import { getDb } from "./db";
import { intentBids, intentRevisions, type IntentBidRow } from "./db/schema";
import { assertTradeAllowed } from "./banned-trades";
import { assertFailedWinnerExclusiveLister } from "./failed-winner-offer";
import {
  assertOperatorBanAllowed,
  listBanRules,
  logBanListMatch,
  matchesBanPattern,
  type BanListRule,
} from "./operator-ban-list";
import { notifyIntentStatus } from "./intent-status-mail";
import {
  appendIntentRevision,
  resetIntentRevisionsForTests,
} from "./intent-revision";
import { logIntentStatusChange } from "./structured-log";
import {
  assertIntentOnly,
  activeStandingUsd,
  canFireFloorSave,
  depositUsdForMark,
  isFloorSaveBid,
  INTENT_STALE_WRITE,
  nextStandingUsd,
  normalizeTradeLabel,
  parseIdempotencyKey,
  parseProxyMaxUsd,
  parseStandingUsd,
  type IntentBid,
  type IntentBidStatus,
  type IntentWriteErrorCode,
  type UserId,
} from "./intent";
import { winnerSeatsFor } from "./winner-portal";

/** Slice 9.1 — cap mutual proxy wars (still no card). */
const MAX_PROXY_DEPTH = 48;

const STATUSES: readonly IntentBidStatus[] = [
  "listed",
  "outbid",
  "withdrawn",
  "approved",
  "rejected",
] as const;

/** Slice 8.1 — mail failure must not undo a successful intent write. */
async function notifyIntentStatusSafe(
  input: Parameters<typeof notifyIntentStatus>[0],
): Promise<void> {
  try {
    await notifyIntentStatus(input);
  } catch {
    // Status / list already committed.
  }
}

/** Slice 12.8 — revision failure must not undo a successful intent write. */
async function recordIntentRevisionSafe(bid: IntentBid): Promise<void> {
  try {
    await appendIntentRevision({
      bidId: bid.id,
      brandLabel: bid.brandLabel,
      tradeLabel: bid.tradeLabel,
      standingUsd: bid.standingUsd,
      artworkUrl: bid.artworkUrl,
    });
  } catch {
    // Bid already listed / edited.
  }
}

const globalForIntent = globalThis as typeof globalThis & {
  __bmbIntentBids?: IntentBid[];
  /** Slice 13.19 — serialize memory-mode approves per panel. */
  __bmbPanelApproveLocks?: Map<string, Promise<unknown>>;
};

function memoryBids(): IntentBid[] {
  if (!globalForIntent.__bmbIntentBids) {
    globalForIntent.__bmbIntentBids = [];
  }
  return globalForIntent.__bmbIntentBids;
}

function panelApproveLocks(): Map<string, Promise<unknown>> {
  if (!globalForIntent.__bmbPanelApproveLocks) {
    globalForIntent.__bmbPanelApproveLocks = new Map();
  }
  return globalForIntent.__bmbPanelApproveLocks;
}

/**
 * Slice 13.19 — operator cannot approve two brands on one panel even if they
 * race. Memory mode serializes approves per panelId; Postgres relies on the
 * unique partial index + demote batch (12.1 / 12.3).
 */
async function withPanelApproveLock<T>(
  panelId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const locks = panelApproveLocks();
  const previous = locks.get(panelId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const chained = previous.catch(() => undefined).then(() => gate);
  locks.set(panelId, chained);
  await previous.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(panelId) === chained) {
      locks.delete(panelId);
    }
  }
}

type IntentStoreEnv = {
  VERCEL_ENV?: string;
  INTENT_MODE?: string;
  DATABASE_URL?: string;
};

/**
 * Memory is CI/local only. Vercel Production never uses memory (SLICES 1.1 / 6.7),
 * even if INTENT_MODE=memory is mis-set. Local `next build` without
 * DATABASE_URL still uses memory when VERCEL_ENV is unset.
 */
export function intentStoreUsesMemory(
  env: IntentStoreEnv = process.env as IntentStoreEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

function useMemoryStore(): boolean {
  return intentStoreUsesMemory();
}

function panelById(panelId: string): Panel | undefined {
  return PANELS.find((panel) => panel.id === panelId);
}

function parseStatus(raw: string): IntentBidStatus {
  if ((STATUSES as readonly string[]).includes(raw)) {
    return raw as IntentBidStatus;
  }
  throw new Error(`Unknown intent status: ${raw}`);
}

function rowToBid(row: IntentBidRow): IntentBid {
  const bid: IntentBid = {
    id: row.id,
    panelId: row.panelId as Panel["id"],
    userId: row.userId,
    brandLabel: row.brandLabel,
    tradeLabel: row.tradeLabel,
    standingUsd: row.standingUsd,
    depositUsd: row.depositUsd,
    status: parseStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    idempotencyKey: row.idempotencyKey ?? null,
    artworkUrl: row.artworkUrl ?? null,
    proxyMaxUsd: row.proxyMaxUsd ?? null,
    floorSaveUsd: row.floorSaveUsd ?? null,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
  };
  assertIntentOnly(bid);
  return bid;
}

export type PlaceIntentInput = {
  panelId: string;
  userId: UserId;
  brandLabel: string;
  tradeLabel: string;
  standingUsd?: number;
  /** Parsed at the action boundary — https or data:image, or null. */
  artworkUrl?: string | null;
  /** Optional proxy ceiling — agent steps max($250, 10%) up to this. */
  proxyMaxUsd?: number | null;
  /**
   * Slice 9.4 — when set, list as floor-save raise-to Y.
   * Stored, not charged. Does not displace standing holders.
   */
  floorSaveUsd?: number | null;
  /**
   * Slice 12.4 — client idempotency key. Replay returns the first bid.
   */
  idempotencyKey?: string | null;
};

type PlaceIntentOptions = {
  /** Internal — proxy agent recursion depth. */
  proxyDepth?: number;
  /**
   * Slice 13.32 — allow listing the 12th panel only on the whole-truck path.
   */
  wholeTruckPath?: boolean;
};

export type PlaceIntentResult =
  | { ok: true; bid: IntentBid }
  | { ok: false; error: string; code?: IntentWriteErrorCode };

const STALE_WRITE_MESSAGE =
  "This intent changed. Reload and try again.";

function staleWriteResult(): PlaceIntentResult {
  return {
    ok: false,
    code: INTENT_STALE_WRITE,
    error: STALE_WRITE_MESSAGE,
  };
}

function nextUpdatedAt(previousIso?: string | null): Date {
  const now = new Date();
  if (previousIso == null || previousIso === "") return now;
  const prevMs = Date.parse(previousIso);
  if (!Number.isFinite(prevMs) || now.getTime() > prevMs) return now;
  // Same-ms writes must still advance the optimistic-lock token (slice 12.2).
  return new Date(prevMs + 1);
}

function nextUpdatedAtIso(previousIso?: string | null): string {
  return nextUpdatedAt(previousIso).toISOString();
}

function assertFreshUpdatedAt(
  bid: IntentBid,
  expectedUpdatedAt: string | undefined,
): PlaceIntentResult | null {
  if (expectedUpdatedAt == null) return null;
  if (bid.updatedAt !== expectedUpdatedAt) return staleWriteResult();
  return null;
}

export async function listBidsForPanel(panelId: string): Promise<IntentBid[]> {
  if (useMemoryStore()) {
    return memoryBids()
      .filter((bid) => bid.panelId === panelId)
      .slice()
      .sort((a, b) => b.standingUsd - a.standingUsd);
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(eq(intentBids.panelId, panelId))
    .orderBy(desc(intentBids.standingUsd));
  return rows.map(rowToBid);
}

/** Lookup one intent by id — shop PDF and operator tools. */
export async function getIntentBidById(
  bidId: string,
): Promise<IntentBid | null> {
  if (!bidId) return null;
  if (useMemoryStore()) {
    return memoryBids().find((bid) => bid.id === bidId) ?? null;
  }
  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(eq(intentBids.id, bidId))
    .limit(1);
  const row = rows[0];
  return row ? rowToBid(row) : null;
}

export async function listBidsPendingApproval(): Promise<IntentBid[]> {
  if (useMemoryStore()) {
    return memoryBids()
      .filter((bid) => bid.status === "listed")
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(eq(intentBids.status, "listed"))
    .orderBy(asc(intentBids.createdAt));
  return rows.map(rowToBid);
}

/** Slice 8.3 — operator filter lists by exact status (newest first except pending). */
export async function listBidsWithStatus(
  status: Extract<
    IntentBidStatus,
    "listed" | "approved" | "rejected" | "outbid"
  >,
): Promise<IntentBid[]> {
  if (status === "listed") {
    return listBidsPendingApproval();
  }

  if (useMemoryStore()) {
    return memoryBids()
      .filter((bid) => bid.status === status)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(eq(intentBids.status, status))
    .orderBy(desc(intentBids.createdAt));
  return rows.map(rowToBid);
}

/**
 * Slice 13.16 — ban-list change re-runs pending (listed) intents.
 * Matching listed → rejected. Approved seats are never touched.
 */
export async function rejectListedMatchingBanRule(
  rule: BanListRule,
): Promise<{ rejectedIds: string[]; approvedLeftAlone: number }> {
  const listed = await listBidsWithStatus("listed");
  const approved = await listBidsWithStatus("approved");
  const approvedLeftAlone = approved.filter((bid) =>
    matchesBanPattern(bid.brandLabel, bid.tradeLabel, rule.pattern),
  ).length;

  const rejectedIds: string[] = [];
  for (const bid of listed) {
    if (!matchesBanPattern(bid.brandLabel, bid.tradeLabel, rule.pattern)) {
      continue;
    }
    logBanListMatch({
      rule,
      brandLabel: bid.brandLabel,
      tradeLabel: bid.tradeLabel,
      context: "sweep",
    });
    const note = `Hard-reject: ban-list “${rule.pattern}” (rule ${rule.id}).`;
    const status = await setIntentStatus(bid.id, "rejected", { note });
    if (status.ok) {
      rejectedIds.push(bid.id);
    }
  }

  // Approved matching rows must still be approved after the sweep.
  for (const bid of approved) {
    const fresh = await getIntentBidById(bid.id);
    if (fresh?.status !== "approved") {
      throw new Error(
        `Ban-list sweep must not touch approved seat ${bid.id}.`,
      );
    }
  }

  return { rejectedIds, approvedLeftAlone };
}

/** Approved + rejected intents, newest first — operator decided log. */
export async function listDecidedBids(): Promise<IntentBid[]> {
  if (useMemoryStore()) {
    return memoryBids()
      .filter((bid) => bid.status === "approved" || bid.status === "rejected")
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(
      and(
        ne(intentBids.status, "listed"),
        ne(intentBids.status, "outbid"),
        ne(intentBids.status, "withdrawn"),
      ),
    )
    .orderBy(desc(intentBids.createdAt));
  return rows
    .map(rowToBid)
    .filter((bid) => bid.status === "approved" || bid.status === "rejected");
}

/**
 * Slice 8.4 — standing intents for operator CSV: listed + approved only.
 * Newest first.
 */
export async function listStandingIntents(): Promise<IntentBid[]> {
  if (useMemoryStore()) {
    return memoryBids()
      .filter((bid) => bid.status === "listed" || bid.status === "approved")
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(inArray(intentBids.status, ["listed", "approved"]))
    .orderBy(desc(intentBids.createdAt));
  return rows.map(rowToBid);
}

/** Approved intents only — wrap-shop partner sheet. */
export async function listApprovedBids(): Promise<IntentBid[]> {
  if (useMemoryStore()) {
    return memoryBids()
      .filter((bid) => bid.status === "approved")
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(eq(intentBids.status, "approved"))
    .orderBy(desc(intentBids.createdAt));
  return rows.map(rowToBid);
}

export async function listBidsForUser(userId: UserId): Promise<IntentBid[]> {
  if (useMemoryStore()) {
    return memoryBids()
      .filter((bid) => bid.userId === userId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(eq(intentBids.userId, userId))
    .orderBy(desc(intentBids.createdAt));
  return rows.map(rowToBid);
}

/** Slice 12.21 — approved seats for one bidder only (winner portal). */
export async function listApprovedBidsForUser(
  userId: UserId,
): Promise<IntentBid[]> {
  const bids = await listBidsForUser(userId);
  return winnerSeatsFor(bids);
}

export async function standingForPanel(panelId: string): Promise<number> {
  const panel = panelById(panelId);
  if (!panel) throw new Error(`Unknown panel: ${panelId}`);
  // Slice 13.14 — withdrawn / outbid / floor-save never ghost a standing mark.
  return activeStandingUsd(await listBidsForPanel(panelId), panel.openingUsd);
}

export async function minimumIntentUsd(panelId: string): Promise<number> {
  const panel = panelById(panelId);
  if (!panel) throw new Error(`Unknown panel: ${panelId}`);
  const active = (await listBidsForPanel(panelId)).filter(
    (bid) =>
      (bid.status === "listed" || bid.status === "approved") &&
      !isFloorSaveBid(bid),
  );
  if (active.length === 0) return panel.openingUsd;
  return nextStandingUsd(await standingForPanel(panelId));
}


const HOLDING_STATUSES: readonly IntentBidStatus[] = ["listed", "approved"] as const;

/** Slice 13.32 — single-panel path cannot cover every seat. */
export const ALL_PANELS_STANDING_ERROR =
  "Same user cannot hold standing on all 12 panels unless the whole-truck path.";

/** Distinct panels where this user holds listed/approved (non floor-save) marks. */
export function distinctHoldingPanelIdsForUser(
  bids: readonly IntentBid[],
  userId: string,
): Set<string> {
  const panels = new Set<string>();
  for (const bid of bids) {
    if (bid.userId !== userId) continue;
    if (!(HOLDING_STATUSES as readonly string[]).includes(bid.status)) continue;
    if (isFloorSaveBid(bid)) continue;
    panels.add(bid.panelId);
  }
  return panels;
}

/**
 * Slice 13.32 — whole-truck path = $10k marks on every panel for same
 * user/brand/trade (listed or approved).
 */
export function isWholeTruckPathCoverage(
  bids: readonly IntentBid[],
  bid: Pick<
    IntentBid,
    "userId" | "brandLabel" | "tradeLabel" | "standingUsd"
  >,
): boolean {
  if (bid.standingUsd !== WHOLE_TRUCK_PANEL_USD) return false;
  const tradeKey = normalizeTradeLabel(bid.tradeLabel);
  for (const panel of PANELS) {
    const match = bids.find(
      (row) =>
        row.panelId === panel.id &&
        row.userId === bid.userId &&
        row.brandLabel === bid.brandLabel &&
        normalizeTradeLabel(row.tradeLabel) === tradeKey &&
        row.standingUsd === WHOLE_TRUCK_PANEL_USD &&
        (row.status === "listed" || row.status === "approved"),
    );
    if (!match) return false;
  }
  return true;
}

function assertMayAddHoldingPanel(input: {
  holders: readonly IntentBid[];
  userId: string;
  panelId: string;
  wholeTruckPath?: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (input.wholeTruckPath) return { ok: true };
  const held = distinctHoldingPanelIdsForUser(input.holders, input.userId);
  if (held.has(input.panelId)) return { ok: true };
  if (held.size >= PANELS.length - 1) {
    return { ok: false, error: ALL_PANELS_STANDING_ERROR };
  }
  return { ok: true };
}

function assertMayApproveTwelfthPanel(input: {
  holders: readonly IntentBid[];
  bid: IntentBid;
}): { ok: true } | { ok: false; error: string } {
  const approvedPanels = new Set<string>();
  for (const row of input.holders) {
    if (row.userId !== input.bid.userId) continue;
    if (row.status !== "approved") continue;
    if (row.id === input.bid.id) continue;
    if (isFloorSaveBid(row)) continue;
    approvedPanels.add(row.panelId);
  }
  if (approvedPanels.has(input.bid.panelId)) return { ok: true };
  if (approvedPanels.size < PANELS.length - 1) return { ok: true };
  if (isWholeTruckPathCoverage(input.holders, input.bid)) return { ok: true };
  return { ok: false, error: ALL_PANELS_STANDING_ERROR };
}

async function listHoldingBids(): Promise<IntentBid[]> {
  if (useMemoryStore()) {
    return memoryBids().filter((bid) =>
      (HOLDING_STATUSES as readonly string[]).includes(bid.status),
    );
  }
  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db.select().from(intentBids);
  return rows
    .map(rowToBid)
    .filter((bid) =>
      (HOLDING_STATUSES as readonly string[]).includes(bid.status),
    );
}

const INTENT_WRITE_FAILED =
  "Could not record intent. Try again. No intent was saved.";

async function findBidByIdempotencyKey(
  key: string,
): Promise<IntentBid | null> {
  if (useMemoryStore()) {
    return (
      memoryBids().find((bid) => bid.idempotencyKey === key) ?? null
    );
  }
  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const rows = await db
    .select()
    .from(intentBids)
    .where(eq(intentBids.idempotencyKey, key))
    .limit(1);
  const row = rows[0];
  return row ? rowToBid(row) : null;
}

export async function placeIntentBid(
  input: PlaceIntentInput,
  opts?: PlaceIntentOptions,
): Promise<PlaceIntentResult> {
  const panel = panelById(input.panelId);
  if (!panel) return { ok: false, error: "Unknown panel." };

  const keyParsed = parseIdempotencyKey(
    input.idempotencyKey === undefined ? null : input.idempotencyKey,
  );
  if (!keyParsed.ok) {
    return { ok: false, error: keyParsed.error };
  }
  const idempotencyKey = keyParsed.idempotencyKey;

  // Slice 12.4 — replay with the same key returns the original bid.
  if (idempotencyKey) {
    try {
      const prior = await findBidByIdempotencyKey(idempotencyKey);
      if (prior) {
        if (prior.userId !== input.userId) {
          return {
            ok: false,
            error: "Idempotency key already used by another account.",
          };
        }
        return { ok: true, bid: prior };
      }
    } catch {
      return { ok: false, error: INTENT_WRITE_FAILED };
    }
  }

  const brandLabel = input.brandLabel.trim();
  if (brandLabel.length < 2 || brandLabel.length > 80) {
    return { ok: false, error: "Brand label must be 2–80 characters." };
  }

  const tradeLabel = input.tradeLabel.trim();
  if (tradeLabel.length < 2 || tradeLabel.length > 80) {
    return { ok: false, error: "Trade must be 2–80 characters." };
  }
  const tradeKey = normalizeTradeLabel(tradeLabel);
  if (!tradeKey) {
    return { ok: false, error: "Trade must be 2–80 characters." };
  }

  const ban = assertTradeAllowed({ brandLabel, tradeLabel });
  if (!ban.ok) {
    return { ok: false, error: ban.error };
  }

  try {
    const rules = await listBanRules();
    const opBan = assertOperatorBanAllowed({
      brandLabel,
      tradeLabel,
      rules,
      context: "place",
    });
    if (!opBan.ok) {
      return { ok: false, error: opBan.error };
    }
  } catch {
    return { ok: false, error: INTENT_WRITE_FAILED };
  }

  // Slice 8.5 — data: uploads land in blob store; ledger keeps path only.
  let artworkUrl: string | null = input.artworkUrl ?? null;
  try {
    const persisted = await persistArtworkForLedger(artworkUrl);
    if (!persisted.ok) {
      return { ok: false, error: persisted.error };
    }
    artworkUrl = persisted.url;
    assertLedgerArtworkUrl(artworkUrl);
  } catch {
    return { ok: false, error: INTENT_WRITE_FAILED };
  }

  let holders: IntentBid[];
  try {
    holders = await listHoldingBids();
  } catch {
    return { ok: false, error: INTENT_WRITE_FAILED };
  }
  const collision = holders.find(
    (bid) =>
      bid.userId !== input.userId &&
      normalizeTradeLabel(bid.tradeLabel) === tradeKey,
  );
  if (collision) {
    return {
      ok: false,
      error: `Trade "${tradeLabel}" is already held by another brand. One brand per trade.`,
    };
  }

  // Slice 13.32 — single-panel path cannot cover all twelve seats.
  const allPanelsGate = assertMayAddHoldingPanel({
    holders,
    userId: input.userId,
    panelId: input.panelId,
    wholeTruckPath: opts?.wholeTruckPath,
  });
  if (!allPanelsGate.ok) {
    return { ok: false, error: allPanelsGate.error };
  }

  // Slice 13.11 — vacant seat with live exclusive offer: only next compliant may list.
  // Slice 14.26 — exclusive target skips banned trades.
  try {
    const panelBids = await listBidsForPanel(input.panelId);
    const panelMin = await minimumIntentUsd(input.panelId);
    const operatorBanRules = await listBanRules();
    const exclusive = assertFailedWinnerExclusiveLister({
      bids: panelBids,
      userId: input.userId,
      panelMinimumUsd: panelMin,
      operatorBanRules,
    });
    if (!exclusive.ok) {
      return { ok: false, error: exclusive.error };
    }
  } catch {
    return { ok: false, error: INTENT_WRITE_FAILED };
  }

  try {
    const asFloorSave =
      input.floorSaveUsd != null && input.floorSaveUsd !== undefined;

    // Slice 1.2: one active listed intent per user per panel — withdraw
    // the caller's prior listed row before min/outbid so replaces don't stack.
    if (useMemoryStore()) {
      for (const existing of memoryBids()) {
        if (
          existing.panelId === input.panelId &&
          existing.status === "listed" &&
          existing.userId === input.userId
        ) {
          existing.status = "withdrawn";
          existing.deletedAt = new Date().toISOString();
          existing.updatedAt = nextUpdatedAtIso(existing.updatedAt);
        }
      }
    } else {
      const dbForWithdraw = getDb();
      if (!dbForWithdraw) {
        return { ok: false, error: "Intent ledger is not configured." };
      }
      await dbForWithdraw
        .update(intentBids)
        .set({
          status: "withdrawn",
          deletedAt: nextUpdatedAt(),
          updatedAt: nextUpdatedAt(),
        })
        .where(
          and(
            eq(intentBids.panelId, input.panelId),
            eq(intentBids.status, "listed"),
            eq(intentBids.userId, input.userId),
          ),
        );
    }

    // Slice 9.4 — floor-save: store raise-to Y if short of $58k. No outbid. No card.
    if (asFloorSave) {
      const board = await loadBoardIntentStats();
      // Slice 13.13 — cannot list/fire when pledged already at floor.
      if (!canFireFloorSave(board.pledgedUsd)) {
        return {
          ok: false,
          error:
            "Floor-save cannot fire when pledged is already at or above $58,000.",
        };
      }
      const y = input.floorSaveUsd as number;
      if (!Number.isFinite(y) || !Number.isInteger(y) || y <= 0) {
        return {
          ok: false,
          error: "Floor-save mark must be a whole dollar amount.",
        };
      }
      if (y < panel.openingUsd) {
        return {
          ok: false,
          error: `Floor-save mark must be at least ${panel.openingUsd}.`,
        };
      }
      if (input.proxyMaxUsd != null && input.proxyMaxUsd !== undefined) {
        return {
          ok: false,
          error: "Floor-save cannot carry a proxy max.",
        };
      }
      const depositUsd = depositUsdForMark(y);
      if (useMemoryStore()) {
        const bid: IntentBid = {
          id: crypto.randomUUID(),
          panelId: panel.id,
          userId: input.userId,
          brandLabel,
          tradeLabel,
          standingUsd: y,
          depositUsd,
          status: "listed",
          createdAt: new Date().toISOString(),
          updatedAt: nextUpdatedAtIso(),
          artworkUrl,
          proxyMaxUsd: null,
          floorSaveUsd: y,
          idempotencyKey,
          deletedAt: null,
        };
        assertIntentOnly(bid);
        memoryBids().push(bid);
        await notifyIntentStatusSafe({ kind: "listed", bid });
        await recordIntentRevisionSafe(bid);
        return { ok: true, bid };
      }
      const dbFloor = getDb();
      if (!dbFloor) {
        return { ok: false, error: "Intent ledger is not configured." };
      }
      const insertedFloor = await dbFloor
        .insert(intentBids)
        .values({
          panelId: panel.id,
          userId: input.userId,
          brandLabel,
          tradeLabel,
          standingUsd: y,
          depositUsd,
          status: "listed",
          artworkUrl,
          proxyMaxUsd: null,
          floorSaveUsd: y,
          updatedAt: nextUpdatedAt(),
          idempotencyKey,
        })
        .returning();
      const floorRow = insertedFloor[0];
      if (!floorRow) return { ok: false, error: "Could not record intent." };
      const floorBid = rowToBid(floorRow);
      await notifyIntentStatusSafe({ kind: "listed", bid: floorBid });
      await recordIntentRevisionSafe(floorBid);
      return { ok: true, bid: floorBid };
    }

    const minimum = await minimumIntentUsd(input.panelId);
    if (input.standingUsd !== undefined && input.standingUsd !== null) {
      const standingParsed = parseStandingUsd(input.standingUsd);
      if (!standingParsed.ok) {
        return { ok: false, error: standingParsed.error };
      }
    }
    const standingUsd = input.standingUsd ?? minimum;
    if (
      !Number.isFinite(standingUsd) ||
      !Number.isInteger(standingUsd) ||
      standingUsd <= 0
    ) {
      return {
        ok: false,
        error: "Standing mark must be a whole dollar amount.",
      };
    }
    if (standingUsd < minimum) {
      return { ok: false, error: `Mark must be at least ${minimum}.` };
    }

    const proxyParsed = parseProxyMaxUsd(
      input.proxyMaxUsd === undefined ? null : input.proxyMaxUsd,
      standingUsd,
    );
    if (!proxyParsed.ok) {
      return { ok: false, error: proxyParsed.error };
    }
    const proxyMaxUsd = proxyParsed.proxyMaxUsd;

    const depositUsd = depositUsdForMark(standingUsd);
    const proxyDepth = opts?.proxyDepth ?? 0;

    if (useMemoryStore()) {
      const outbidTargets: IntentBid[] = [];
      for (const existing of memoryBids()) {
        if (
          existing.panelId === input.panelId &&
          existing.status === "listed" &&
          existing.userId !== input.userId &&
          !isFloorSaveBid(existing)
        ) {
          const snapshot: IntentBid = { ...existing };
          // Slice 13.20 — outbid is soft-status only; never hard-delete.
          existing.status = "outbid";
          existing.updatedAt = nextUpdatedAtIso(existing.updatedAt);
          outbidTargets.push({ ...snapshot, status: "outbid" });
        }
      }

      const bid: IntentBid = {
        id: crypto.randomUUID(),
        panelId: panel.id,
        userId: input.userId,
        brandLabel,
        tradeLabel,
        standingUsd,
        depositUsd,
        status: "listed",
        createdAt: new Date().toISOString(),
        updatedAt: nextUpdatedAtIso(),
        artworkUrl,
        proxyMaxUsd,
        floorSaveUsd: null,
        idempotencyKey,
        deletedAt: null,
      };
      assertIntentOnly(bid);
      memoryBids().push(bid);
      await notifyIntentStatusSafe({ kind: "listed", bid });
      for (const outbid of outbidTargets) {
        await notifyIntentStatusSafe({
          kind: "outbid",
          bid: outbid,
          // Slice 13.18 / 9.2 — next min from the new listed standing.
          nextMinimumUsd: nextStandingUsd(standingUsd),
        });
      }
      await runProxyMaxAgent({
        panelId: input.panelId,
        listed: bid,
        outbidTargets,
        proxyDepth,
      });
      const fresh =
        memoryBids().find((row) => row.id === bid.id) ?? bid;
      await recordIntentRevisionSafe(fresh);
      return { ok: true, bid: { ...fresh } };
    }

    const db = getDb();
    if (!db) {
      return { ok: false, error: "Intent ledger is not configured." };
    }

    const priorListed = await db
      .select()
      .from(intentBids)
      .where(
        and(
          eq(intentBids.panelId, input.panelId),
          eq(intentBids.status, "listed"),
          ne(intentBids.userId, input.userId),
          isNull(intentBids.floorSaveUsd),
        ),
      );

    // Slice 12.1 — Neon HTTP has no interactive txn; db.batch runs a
    // non-interactive Postgres transaction (outbid + insert together).
    // Floor-save rows stay listed — they do not hold the seat yet.
    const outbidOthers = db
      .update(intentBids)
      .set({ status: "outbid", updatedAt: nextUpdatedAt() })
      .where(
        and(
          eq(intentBids.panelId, input.panelId),
          eq(intentBids.status, "listed"),
          ne(intentBids.userId, input.userId),
          isNull(intentBids.floorSaveUsd),
        ),
      );
    const insertListed = db
      .insert(intentBids)
      .values({
        panelId: panel.id,
        userId: input.userId,
        brandLabel,
        tradeLabel,
        standingUsd,
        depositUsd,
        status: "listed",
        artworkUrl,
        proxyMaxUsd,
        floorSaveUsd: null,
        updatedAt: nextUpdatedAt(),
        idempotencyKey,
      })
      .returning();

    const [, inserted] = await db.batch([outbidOthers, insertListed]);

    const row = inserted[0];
    if (!row) return { ok: false, error: "Could not record intent." };
    const bid = rowToBid(row);
    const outbidTargets = priorListed.map((prior) => ({
      ...rowToBid(prior),
      status: "outbid" as const,
    }));
    await notifyIntentStatusSafe({ kind: "listed", bid });
    for (const outbid of outbidTargets) {
      await notifyIntentStatusSafe({
        kind: "outbid",
        bid: outbid,
        // Slice 13.18 / 9.2 — next min from the new listed standing.
        nextMinimumUsd: nextStandingUsd(standingUsd),
      });
    }
    await runProxyMaxAgent({
      panelId: input.panelId,
      listed: bid,
      outbidTargets,
      proxyDepth,
    });
    const fresh = (await getIntentBidById(bid.id)) ?? bid;
    await recordIntentRevisionSafe(fresh);
    return { ok: true, bid: fresh };
  } catch {
    // Slice 6.5 — structured failure only; never claim the intent listed.
    return { ok: false, error: INTENT_WRITE_FAILED };
  }
}

/**
 * Slice 9.1 — when a listed mark outbids holders with a proxy ceiling,
 * the agent steps standing + max($250, 10%) up to proxyMax. Still no card.
 * Slice 14.27 — withdrawn bids never feed the proxy agent (ceiling cleared).
 */
async function runProxyMaxAgent(input: {
  panelId: string;
  listed: IntentBid;
  outbidTargets: IntentBid[];
  proxyDepth: number;
}): Promise<void> {
  if (input.proxyDepth >= MAX_PROXY_DEPTH) return;
  if (input.outbidTargets.length === 0) return;

  const next = nextStandingUsd(input.listed.standingUsd);
  const able: { target: IntentBid; ceiling: number }[] = [];
  for (const target of input.outbidTargets) {
    if (target.userId === input.listed.userId) continue;
    if (target.status === "withdrawn" || target.deletedAt) continue;
    // Live row may have been withdrawn (and proxy cleared) since the snapshot.
    const live = await getIntentBidById(target.id);
    if (
      live &&
      (live.status === "withdrawn" ||
        live.deletedAt != null ||
        live.proxyMaxUsd == null)
    ) {
      continue;
    }
    const ceiling = live?.proxyMaxUsd ?? target.proxyMaxUsd;
    if (ceiling == null || ceiling < next) continue;
    able.push({ target, ceiling });
  }
  if (able.length === 0) return;

  able.sort((a, b) => {
    const byMax = b.ceiling - a.ceiling;
    if (byMax !== 0) return byMax;
    return b.target.createdAt.localeCompare(a.target.createdAt);
  });
  const agent = able[0];
  if (!agent) return;

  await placeIntentBid(
    {
      panelId: input.panelId,
      userId: agent.target.userId,
      brandLabel: agent.target.brandLabel,
      tradeLabel: agent.target.tradeLabel,
      standingUsd: next,
      artworkUrl: agent.target.artworkUrl,
      proxyMaxUsd: agent.ceiling,
    },
    { proxyDepth: input.proxyDepth + 1 },
  );
}

export async function setIntentStatus(
  bidId: string,
  status: Extract<IntentBidStatus, "approved" | "rejected" | "withdrawn">,
  opts?: { note?: string; expectedUpdatedAt?: string },
): Promise<PlaceIntentResult> {
  // Slice 13.17 — whole-truck reject rolls back all twelve rows together.
  if (status === "rejected") {
    const siblings = await listWholeTruckSiblingBids(bidId);
    if (siblings) {
      const rolled = await rejectWholeTruckIntent({
        bidId,
        note: opts?.note ?? "",
      });
      if (!rolled.ok) return { ok: false, error: rolled.error };
      const primary =
        rolled.bids.find((row) => row.id === bidId) ?? rolled.bids[0];
      if (!primary) return { ok: false, error: "Bid not found." };
      return { ok: true, bid: primary };
    }
  }

  if (useMemoryStore()) {
    const bid = memoryBids().find((row) => row.id === bidId);
    if (!bid) return { ok: false, error: "Bid not found." };
    const stale = assertFreshUpdatedAt(bid, opts?.expectedUpdatedAt);
    if (stale) return stale;

    if (status === "approved") {
      // Slice 13.19 — serialize concurrent brand approves on one panel.
      return withPanelApproveLock(bid.panelId, async () => {
        const live = memoryBids().find((row) => row.id === bidId);
        if (!live) return { ok: false, error: "Bid not found." };
        const staleInside = assertFreshUpdatedAt(
          live,
          opts?.expectedUpdatedAt,
        );
        if (staleInside) return staleInside;

        const ban = assertTradeAllowed({
          brandLabel: live.brandLabel,
          tradeLabel: live.tradeLabel,
        });
        if (!ban.ok) return { ok: false, error: ban.error };

        // Slice 13.32 — twelfth approved seat only via whole-truck path.
        const twelfth = assertMayApproveTwelfthPanel({
          holders: memoryBids(),
          bid: live,
        });
        if (!twelfth.ok) return { ok: false, error: twelfth.error };

        const demoted: IntentBid[] = [];
        // Slice 12.1 — at most one approved standing per panel.
        for (const existing of memoryBids()) {
          if (
            existing.id !== bidId &&
            existing.panelId === live.panelId &&
            existing.status === "approved"
          ) {
            existing.status = "outbid";
            existing.updatedAt = nextUpdatedAtIso(existing.updatedAt);
            assertIntentOnly(existing);
            demoted.push({ ...existing });
          }
        }
        live.status = "approved";
        live.updatedAt = nextUpdatedAtIso(live.updatedAt);
        assertIntentOnly(live);
        logIntentStatusChange({
          bidId: live.id,
          panelId: live.panelId,
          status: "approved",
          userId: live.userId,
        });
        await notifyIntentStatusSafe({
          kind: "approved",
          bid: { ...live },
          note: opts?.note,
        });
        for (const prior of demoted) {
          logIntentStatusChange({
            bidId: prior.id,
            panelId: prior.panelId,
            status: "outbid",
            userId: prior.userId,
          });
          await notifyIntentStatusSafe({
            kind: "outbid",
            bid: prior,
            nextMinimumUsd: nextStandingUsd(live.standingUsd),
          });
        }
        return { ok: true, bid: { ...live } };
      });
    }

    bid.status = status;
    if (status === "withdrawn") {
      // Slice 14.27 — clear proxy ceiling so it cannot fire after withdraw.
      bid.deletedAt = new Date().toISOString();
      bid.proxyMaxUsd = null;
    }
    bid.updatedAt = nextUpdatedAtIso(bid.updatedAt);
    assertIntentOnly(bid);
    logIntentStatusChange({
      bidId: bid.id,
      panelId: bid.panelId,
      status,
      userId: bid.userId,
    });
    if (status === "rejected") {
      await notifyIntentStatusSafe({
        kind: status,
        bid: { ...bid },
        note: opts?.note,
      });
    }
    return { ok: true, bid };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Intent ledger is not configured." };
  }

  const existingRow = await db
    .select()
    .from(intentBids)
    .where(eq(intentBids.id, bidId))
    .limit(1);
  const current = existingRow[0];
  if (!current) return { ok: false, error: "Bid not found." };
  const currentBid = rowToBid(current);
  const stale = assertFreshUpdatedAt(currentBid, opts?.expectedUpdatedAt);
  if (stale) return stale;

  const touchAt = nextUpdatedAt(currentBid.updatedAt);
  const idLock =
    opts?.expectedUpdatedAt != null
      ? and(
          eq(intentBids.id, bidId),
          eq(intentBids.updatedAt, new Date(opts.expectedUpdatedAt)),
        )
      : eq(intentBids.id, bidId);

  if (status === "approved") {
    const ban = assertTradeAllowed({
      brandLabel: current.brandLabel,
      tradeLabel: current.tradeLabel,
    });
    if (!ban.ok) return { ok: false, error: ban.error };

    // Slice 13.32 — twelfth approved seat only via whole-truck path.
    let holdersForGate: IntentBid[];
    try {
      holdersForGate = await listHoldingBids();
    } catch {
      return { ok: false, error: INTENT_WRITE_FAILED };
    }
    const twelfth = assertMayApproveTwelfthPanel({
      holders: holdersForGate,
      bid: currentBid,
    });
    if (!twelfth.ok) return { ok: false, error: twelfth.error };

    const priorApproved = await db
      .select()
      .from(intentBids)
      .where(
        and(
          eq(intentBids.panelId, current.panelId),
          eq(intentBids.status, "approved"),
          ne(intentBids.id, bidId),
        ),
      );

    // Slice 12.1 — demote prior approved + approve in one Neon HTTP batch txn.
    const demotePrior = db
      .update(intentBids)
      .set({ status: "outbid", updatedAt: touchAt })
      .where(
        and(
          eq(intentBids.panelId, current.panelId),
          eq(intentBids.status, "approved"),
          ne(intentBids.id, bidId),
        ),
      );
    const approveThis = db
      .update(intentBids)
      .set({ status: "approved", updatedAt: touchAt })
      .where(idLock)
      .returning();
    const [, updated] = await db.batch([demotePrior, approveThis]);
    const row = updated[0];
    if (!row) {
      if (opts?.expectedUpdatedAt != null) return staleWriteResult();
      return { ok: false, error: "Bid not found." };
    }
    const bid = rowToBid(row);
    await notifyIntentStatusSafe({
      kind: "approved",
      bid,
      note: opts?.note,
    });
    logIntentStatusChange({
      bidId: bid.id,
      panelId: bid.panelId,
      status: "approved",
      userId: bid.userId,
    });
    for (const prior of priorApproved) {
      const priorBid = { ...rowToBid(prior), status: "outbid" as const };
      logIntentStatusChange({
        bidId: priorBid.id,
        panelId: priorBid.panelId,
        status: "outbid",
        userId: priorBid.userId,
      });
      await notifyIntentStatusSafe({
        kind: "outbid",
        bid: priorBid,
        // Slice 13.18 — demoted by approve; next min from new approved standing.
        nextMinimumUsd: nextStandingUsd(bid.standingUsd),
      });
    }
    return { ok: true, bid };
  }

  const updated = await db
    .update(intentBids)
    .set(
      status === "withdrawn"
        ? {
            status,
            updatedAt: touchAt,
            deletedAt: touchAt,
            // Slice 14.27 — clear proxy ceiling on withdraw.
            proxyMaxUsd: null,
          }
        : { status, updatedAt: touchAt },
    )
    .where(idLock)
    .returning();
  const row = updated[0];
  if (!row) {
    if (opts?.expectedUpdatedAt != null) return staleWriteResult();
    return { ok: false, error: "Bid not found." };
  }
  const bid = rowToBid(row);
  logIntentStatusChange({
    bidId: bid.id,
    panelId: bid.panelId,
    status,
    userId: bid.userId,
  });
  if (status === "rejected") {
    await notifyIntentStatusSafe({
      kind: status,
      bid,
      note: opts?.note,
    });
  }
  return { ok: true, bid };
}

/** Slice 12.1 — approved standing count for one panel (must be 0 or 1). */
export async function countApprovedStandingForPanel(
  panelId: string,
): Promise<number> {
  const bids = await listBidsForPanel(panelId);
  return bids.filter((bid) => bid.status === "approved").length;
}

/**
 * Slice 13.13 — fire a listed floor-save into a normal standing mark at Y.
 * Refuses when public pledged is already >= $58,000. Still intent only — no card.
 * Slice 14.28 — rejected floor-save marks cannot fire / be raised.
 */
export const FLOOR_SAVE_REJECTED_ERROR =
  "Floor-save cannot raise a rejected mark.";

export async function fireFloorSaveBid(input: {
  bidId: string;
}): Promise<PlaceIntentResult> {
  const bid = await getIntentBidById(input.bidId);
  if (!bid) return { ok: false, error: "Bid not found." };
  if (!isFloorSaveBid(bid) || bid.floorSaveUsd == null) {
    return { ok: false, error: "Not a floor-save intent." };
  }
  // Slice 14.28 — rejected marks stay rejected; never fire into standing.
  if (bid.status === "rejected") {
    return { ok: false, error: FLOOR_SAVE_REJECTED_ERROR };
  }
  if (bid.status !== "listed") {
    return { ok: false, error: "Only listed floor-save intents can fire." };
  }

  let board: BoardIntentStats;
  try {
    board = await loadBoardIntentStats();
  } catch {
    return { ok: false, error: INTENT_WRITE_FAILED };
  }
  if (!canFireFloorSave(board.pledgedUsd)) {
    return {
      ok: false,
      error:
        "Floor-save cannot fire when pledged is already at or above $58,000.",
    };
  }

  return placeIntentBid({
    panelId: bid.panelId,
    userId: bid.userId,
    brandLabel: bid.brandLabel,
    tradeLabel: bid.tradeLabel,
    standingUsd: bid.floorSaveUsd,
    artworkUrl: bid.artworkUrl,
  });
}

/**
 * Slice 9.7 — owner may withdraw while status is listed (pending) only.
 * Approved needs operator. Soft-status to withdrawn — never hard-delete.
 */
export async function withdrawPendingIntent(input: {
  bidId: string;
  userId: UserId;
  expectedUpdatedAt?: string;
}): Promise<PlaceIntentResult> {
  const bid = await getIntentBidById(input.bidId);
  if (!bid) return { ok: false, error: "Bid not found." };
  if (bid.userId !== input.userId) {
    return { ok: false, error: "You can only withdraw your own intent." };
  }
  if (bid.status === "approved") {
    return {
      ok: false,
      error: "Approved needs operator. You cannot withdraw this intent.",
    };
  }
  if (bid.status !== "listed") {
    return {
      ok: false,
      error: "Only pending (listed) intents can be withdrawn.",
    };
  }
  return setIntentStatus(bid.id, "withdrawn", {
    expectedUpdatedAt: input.expectedUpdatedAt ?? bid.updatedAt,
  });
}

/**
 * Slice 12.9 — hard-delete guard. Soft-deleted (withdrawn) rows may be
 * purged; approved standing seats must never be hard-deleted.
 */
export async function hardDeleteIntentBid(
  bidId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bid = await getIntentBidById(bidId);
  if (!bid) return { ok: false, error: "Bid not found." };
  if (bid.status === "approved") {
    return {
      ok: false,
      error: "Never hard-delete an approved bid.",
    };
  }
  if (bid.status !== "withdrawn" || !bid.deletedAt) {
    return {
      ok: false,
      error: "Only soft-deleted withdrawn rows can be hard-deleted.",
    };
  }

  if (useMemoryStore()) {
    const rows = memoryBids();
    const idx = rows.findIndex((row) => row.id === bidId);
    if (idx < 0) return { ok: false, error: "Bid not found." };
    rows.splice(idx, 1);
    return { ok: true };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Intent ledger is not configured." };
  }
  const removed = await db
    .delete(intentBids)
    .where(
      and(
        eq(intentBids.id, bidId),
        eq(intentBids.status, "withdrawn"),
        isNotNull(intentBids.deletedAt),
      ),
    )
    .returning();
  if (!removed[0]) {
    return { ok: false, error: "Bid not found." };
  }
  return { ok: true };
}

/**
 * Slice 9.8 / 13.15 — owner may edit brand / trade / art while listed (pending)
 * only. Standing amount unchanged. Each successful edit appends an intent
 * revision row (12.8). Approved needs operator.
 */
export async function editPendingIntent(input: {
  bidId: string;
  userId: UserId;
  brandLabel: string;
  tradeLabel: string;
  artworkUrl?: string | null;
  /** Slice 12.2 — must match the row the caller read. */
  expectedUpdatedAt?: string;
}): Promise<PlaceIntentResult> {
  const bid = await getIntentBidById(input.bidId);
  if (!bid) return { ok: false, error: "Bid not found." };
  if (bid.userId !== input.userId) {
    return { ok: false, error: "You can only edit your own intent." };
  }
  if (bid.status === "approved") {
    return {
      ok: false,
      error: "Approved needs operator. You cannot edit this intent.",
    };
  }
  if (bid.status !== "listed") {
    return {
      ok: false,
      error: "Only pending (listed) intents can be edited.",
    };
  }

  const expectedUpdatedAt = input.expectedUpdatedAt ?? bid.updatedAt;
  const stale = assertFreshUpdatedAt(bid, expectedUpdatedAt);
  if (stale) return stale;

  const brandLabel = input.brandLabel.trim();
  if (brandLabel.length < 2 || brandLabel.length > 80) {
    return { ok: false, error: "Brand label must be 2–80 characters." };
  }
  const tradeLabel = input.tradeLabel.trim();
  if (tradeLabel.length < 2 || tradeLabel.length > 80) {
    return { ok: false, error: "Trade must be 2–80 characters." };
  }
  const tradeKey = normalizeTradeLabel(tradeLabel);
  if (!tradeKey) {
    return { ok: false, error: "Trade must be 2–80 characters." };
  }

  const ban = assertTradeAllowed({ brandLabel, tradeLabel });
  if (!ban.ok) {
    return { ok: false, error: ban.error };
  }
  try {
    const rules = await listBanRules();
    const opBan = assertOperatorBanAllowed({
      brandLabel,
      tradeLabel,
      rules,
      context: "edit",
    });
    if (!opBan.ok) {
      return { ok: false, error: opBan.error };
    }
  } catch {
    return { ok: false, error: INTENT_WRITE_FAILED };
  }

  let artworkUrl: string | null =
    input.artworkUrl === undefined ? bid.artworkUrl : input.artworkUrl;
  try {
    const persisted = await persistArtworkForLedger(artworkUrl);
    if (!persisted.ok) {
      return { ok: false, error: persisted.error };
    }
    artworkUrl = persisted.url;
    assertLedgerArtworkUrl(artworkUrl);
  } catch {
    return { ok: false, error: INTENT_WRITE_FAILED };
  }

  let holders: IntentBid[];
  try {
    holders = await listHoldingBids();
  } catch {
    return { ok: false, error: INTENT_WRITE_FAILED };
  }
  const collision = holders.find(
    (row) =>
      row.id !== bid.id &&
      row.userId !== input.userId &&
      normalizeTradeLabel(row.tradeLabel) === tradeKey,
  );
  if (collision) {
    return {
      ok: false,
      error: `Trade "${tradeLabel}" is already held by another brand. One brand per trade.`,
    };
  }

  if (useMemoryStore()) {
    // Re-check after validation — another writer may have bumped updatedAt.
    const live = memoryBids().find((row) => row.id === bid.id);
    if (!live || live.status !== "listed") {
      return {
        ok: false,
        error: "Only pending (listed) intents can be edited.",
      };
    }
    const again = assertFreshUpdatedAt(live, expectedUpdatedAt);
    if (again) return again;
    live.brandLabel = brandLabel;
    live.tradeLabel = tradeLabel;
    live.artworkUrl = artworkUrl;
    live.updatedAt = nextUpdatedAtIso(live.updatedAt);
    assertIntentOnly(live);
    await recordIntentRevisionSafe(live);
    return { ok: true, bid: live };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Intent ledger is not configured." };
  }
  const updated = await db
    .update(intentBids)
    .set({
      brandLabel,
      tradeLabel,
      artworkUrl,
      updatedAt: nextUpdatedAt(expectedUpdatedAt),
    })
    .where(
      and(
        eq(intentBids.id, bid.id),
        eq(intentBids.status, "listed"),
        eq(intentBids.updatedAt, new Date(expectedUpdatedAt)),
      ),
    )
    .returning();
  const row = updated[0];
  if (!row) {
    const latest = await getIntentBidById(bid.id);
    if (latest && latest.updatedAt !== expectedUpdatedAt) {
      return staleWriteResult();
    }
    return {
      ok: false,
      error: "Only pending (listed) intents can be edited.",
    };
  }
  const next = rowToBid(row);
  assertIntentOnly(next);
  await recordIntentRevisionSafe(next);
  return { ok: true, bid: next };
}

export async function resetIntentStoreForTests(): Promise<void> {
  resetArtworkBlobStoreForTests();
  resetIntentRevisionsForTests();
  if (useMemoryStore()) {
    globalForIntent.__bmbIntentBids = [];
    globalForIntent.__bmbPanelApproveLocks = new Map();
    return;
  }
  const db = getDb();
  if (!db) return;
  await db.delete(intentRevisions);
  await db.delete(intentBids);
}

/** Per-panel standing so twelve seats sum to GOAL_USD ($10,000 × 12). */
export const WHOLE_TRUCK_PANEL_USD = GOAL_USD / PANELS.length;

export type PlaceWholeTruckInput = {
  userId: UserId;
  brandLabel: string;
  tradeLabel: string;
  artworkUrl?: string | null;
};

export type PlaceWholeTruckResult =
  | { ok: true; bids: IntentBid[] }
  | { ok: false; error: string };

/** Slice 9.5 — hide whole-truck control when pledged >= $120,000. */
export function isWholeTruckIntentOpen(pledgedUsd: number): boolean {
  return Number.isFinite(pledgedUsd) && pledgedUsd < GOAL_USD;
}

/**
 * Slice 4.5 / 12.29 — whole-truck $120,000 intent.
 * Lists the same brand on all twelve seats at $10,000 each (intent only —
 * not charged). Releases listed (pending) marks so the field can clear.
 * Rejects when any panel already has approved standing (12.29 — no stack).
 * Rejects when public pledged standing is already at buyout (9.5).
 */
export async function placeWholeTruckIntent(
  input: PlaceWholeTruckInput,
): Promise<PlaceWholeTruckResult> {
  if (WHOLE_TRUCK_PANEL_USD * PANELS.length !== GOAL_USD) {
    return { ok: false, error: "Whole-truck panel split must equal buyout." };
  }

  const board = await loadBoardIntentStats();
  if (!isWholeTruckIntentOpen(board.pledgedUsd)) {
    return {
      ok: false,
      error: "Whole-truck buyout is already met. Field is at $120,000.",
    };
  }

  const brandLabel = input.brandLabel.trim();
  if (brandLabel.length < 2 || brandLabel.length > 80) {
    return { ok: false, error: "Brand label must be 2–80 characters." };
  }
  const tradeLabel = input.tradeLabel.trim();
  if (tradeLabel.length < 2 || tradeLabel.length > 80) {
    return { ok: false, error: "Trade must be 2–80 characters." };
  }
  if (!normalizeTradeLabel(tradeLabel)) {
    return { ok: false, error: "Trade must be 2–80 characters." };
  }
  const ban = assertTradeAllowed({ brandLabel, tradeLabel });
  if (!ban.ok) {
    return { ok: false, error: ban.error };
  }

  // Slice 12.29 — cannot stack whole-truck on approved standing seats.
  for (const panel of PANELS) {
    const approvedCount = await countApprovedStandingForPanel(panel.id);
    if (approvedCount > 0) {
      return {
        ok: false,
        error:
          "Whole-truck intent cannot stack on a panel that already has approved standing.",
      };
    }
  }

  // Release listed (not approved) marks so one brand can take every panel.
  for (const panel of PANELS) {
    const bids = await listBidsForPanel(panel.id);
    for (const bid of bids) {
      if (bid.status === "listed") {
        const released = await setIntentStatus(bid.id, "withdrawn");
        if (!released.ok) {
          return { ok: false, error: released.error };
        }
      }
    }
  }

  const placed: IntentBid[] = [];
  for (const panel of PANELS) {
    const result = await placeIntentBid(
      {
        panelId: panel.id,
        userId: input.userId,
        brandLabel,
        tradeLabel,
        standingUsd: WHOLE_TRUCK_PANEL_USD,
        artworkUrl: input.artworkUrl,
      },
      { wholeTruckPath: true },
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    placed.push(result.bid);
  }

  return { ok: true, bids: placed };
}

/**
 * Slice 13.17 — detect a whole-truck set: same user/brand/trade at
 * WHOLE_TRUCK_PANEL_USD on all twelve panels (listed).
 */
export async function listWholeTruckSiblingBids(
  bidId: string,
): Promise<IntentBid[] | null> {
  const bid = await getIntentBidById(bidId);
  if (!bid) return null;
  if (bid.standingUsd !== WHOLE_TRUCK_PANEL_USD) return null;
  if (bid.status !== "listed" && bid.status !== "rejected") return null;

  const tradeKey = normalizeTradeLabel(bid.tradeLabel);
  const siblings: IntentBid[] = [];
  for (const panel of PANELS) {
    const bids = await listBidsForPanel(panel.id);
    const match = bids.find(
      (row) =>
        row.userId === bid.userId &&
        row.brandLabel === bid.brandLabel &&
        normalizeTradeLabel(row.tradeLabel) === tradeKey &&
        row.standingUsd === WHOLE_TRUCK_PANEL_USD &&
        (row.status === "listed" || row.id === bid.id),
    );
    if (!match) return null;
    siblings.push(match);
  }
  return siblings.length === PANELS.length ? siblings : null;
}

/**
 * Slice 13.17 — reject whole-truck rolls back all twelve rows in one
 * transaction. Still intent only — no card. Campaign clock stays unset.
 */
export async function rejectWholeTruckIntent(input: {
  bidId: string;
  note: string;
}): Promise<
  | { ok: true; bids: IntentBid[] }
  | { ok: false; error: string }
> {
  const siblings = await listWholeTruckSiblingBids(input.bidId);
  if (!siblings) {
    return { ok: false, error: "Not a whole-truck listed set." };
  }

  const note = input.note.trim();
  if (!note) {
    return { ok: false, error: "Reject note is required." };
  }

  if (useMemoryStore()) {
    const snapshots = siblings.map((row) => ({ ...row }));
    const rejected: IntentBid[] = [];
    try {
      for (const row of siblings) {
        const live = memoryBids().find((b) => b.id === row.id);
        if (!live || live.status !== "listed") {
          throw new Error("Whole-truck row missing or not listed.");
        }
        live.status = "rejected";
        live.updatedAt = nextUpdatedAtIso(live.updatedAt);
        assertIntentOnly(live);
        rejected.push({ ...live });
      }
      for (const bid of rejected) {
        await notifyIntentStatusSafe({
          kind: "rejected",
          bid,
          note,
        });
        logIntentStatusChange({
          bidId: bid.id,
          panelId: bid.panelId,
          status: "rejected",
          userId: bid.userId,
        });
      }
      return { ok: true, bids: rejected };
    } catch (err) {
      for (const snap of snapshots) {
        const live = memoryBids().find((b) => b.id === snap.id);
        if (live) {
          live.status = snap.status;
          live.updatedAt = snap.updatedAt;
        }
      }
      return {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Whole-truck reject rolled back.",
      };
    }
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Intent ledger is not configured." };
  }

  const touchAt = nextUpdatedAt();
  // Neon batch requires a non-empty tuple; map() alone is `T[]`.
  const [firstSibling, ...restSiblings] = siblings;
  if (!firstSibling) {
    return { ok: false, error: "Not a whole-truck listed set." };
  }
  const rejectRow = (row: IntentBid) =>
    db
      .update(intentBids)
      .set({ status: "rejected", updatedAt: touchAt })
      .where(
        and(eq(intentBids.id, row.id), eq(intentBids.status, "listed")),
      )
      .returning();
  const results = await db.batch([
    rejectRow(firstSibling),
    ...restSiblings.map(rejectRow),
  ]);
  const rejected: IntentBid[] = [];
  for (const rows of results) {
    const row = rows[0];
    if (!row) {
      return {
        ok: false,
        error: "Whole-truck reject could not update all twelve rows.",
      };
    }
    rejected.push(rowToBid(row));
  }
  if (rejected.length !== PANELS.length) {
    return {
      ok: false,
      error: "Whole-truck reject could not update all twelve rows.",
    };
  }
  for (const bid of rejected) {
    await notifyIntentStatusSafe({ kind: "rejected", bid, note });
    logIntentStatusChange({
      bidId: bid.id,
      panelId: bid.panelId,
      status: "rejected",
      userId: bid.userId,
    });
  }
  return { ok: true, bids: rejected };
}

export type BoardIntentStats = {
  pledgedUsd: number;
  seatedPanels: number;
  openSeats: number;
};

/**
 * Public board standing = sum of approved intents only (slice 4.1).
 * Listed (not yet approved) does not count toward pledged intent.
 * Empty panels do not count opening marks as pledged.
 * Soft-fails to an empty board if the ledger is unreachable (e.g. migration
 * not applied yet on preview) so the homepage can still render.
 */
export async function loadBoardIntentStats(): Promise<BoardIntentStats> {
  const empty: BoardIntentStats = {
    pledgedUsd: 0,
    seatedPanels: 0,
    openSeats: PANELS.length,
  };
  try {
    let pledgedUsd = 0;
    let seatedPanels = 0;
    for (const panel of PANELS) {
      const bids = await listBidsForPanel(panel.id);
      const approved = bids.filter(
        (bid) => bid.status === "approved" && !isFloorSaveBid(bid),
      );
      if (approved.length === 0) continue;
      seatedPanels += 1;
      pledgedUsd += Math.max(...approved.map((bid) => bid.standingUsd));
    }
    return {
      pledgedUsd,
      seatedPanels,
      openSeats: PANELS.length - seatedPanels,
    };
  } catch {
    return empty;
  }
}

/** Standing holder (highest listed/approved) per panel, if any. */
export type StandingHolder = {
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
  /** Slice 13.36 — seat owner userId for download gates. */
  userId: string;
};

export async function loadStandingHoldersByPanel(): Promise<
  Map<string, StandingHolder>
> {
  const map = new Map<string, StandingHolder>();
  for (const panel of PANELS) {
    const bids = await listBidsForPanel(panel.id);
    const active = bids
      .filter(
        (bid) =>
          (bid.status === "listed" || bid.status === "approved") &&
          !isFloorSaveBid(bid),
      )
      .sort((a, b) => b.standingUsd - a.standingUsd);
    const top = active[0];
    if (top) {
      map.set(panel.id, {
        brandLabel: top.brandLabel,
        tradeLabel: top.tradeLabel,
        standingUsd: top.standingUsd,
        userId: top.userId,
      });
    }
  }
  return map;
}

/**
 * Slice 12.16 — account delete. Replace owner userId with an opaque token.
 * Standing amounts / brand / status stay so the public board does not shrink.
 */
export async function anonymizeIntentBidsForUser(
  userId: UserId,
): Promise<{ ok: true; anonymizedUserId: string; count: number }> {
  const trimmed = userId.trim();
  if (!trimmed || isAnonymizedUserId(trimmed)) {
    return {
      ok: true,
      anonymizedUserId: trimmed || anonymizedUserId("unknown"),
      count: 0,
    };
  }

  const nextUserId = anonymizedUserId(trimmed);
  const touchAt = nextUpdatedAt();

  if (useMemoryStore()) {
    let count = 0;
    for (const bid of memoryBids()) {
      if (bid.userId !== trimmed) continue;
      bid.userId = nextUserId;
      bid.updatedAt = touchAt.toISOString();
      count += 1;
    }
    return { ok: true, anonymizedUserId: nextUserId, count };
  }

  const db = getDb();
  if (!db) {
    throw new Error("Intent ledger requires DATABASE_URL.");
  }
  const updated = await db
    .update(intentBids)
    .set({ userId: nextUserId, updatedAt: touchAt })
    .where(eq(intentBids.userId, trimmed))
    .returning({ id: intentBids.id });

  return {
    ok: true,
    anonymizedUserId: nextUserId,
    count: updated.length,
  };
}

