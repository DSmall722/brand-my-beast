/**
 * Intent bid ledger — memory (CI/local) or Postgres (DATABASE_URL).
 * Intent only — never stores Stripe/capture fields. See P2.md.
 */

import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import {
  assertLedgerArtworkUrl,
  persistArtworkForLedger,
  resetArtworkBlobStoreForTests,
} from "./artwork-blob";
import { GOAL_USD, PANELS, type Panel } from "./campaign";
import { getDb } from "./db";
import { intentBids, type IntentBidRow } from "./db/schema";
import { assertTradeAllowed } from "./banned-trades";
import {
  assertOperatorBanAllowed,
  listBanRules,
} from "./operator-ban-list";
import { notifyIntentStatus } from "./intent-status-mail";
import {
  assertIntentOnly,
  depositUsdForMark,
  isFloorSaveBid,
  nextStandingUsd,
  normalizeTradeLabel,
  parseProxyMaxUsd,
  type IntentBid,
  type IntentBidStatus,
  type UserId,
} from "./intent";

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

const globalForIntent = globalThis as typeof globalThis & {
  __bmbIntentBids?: IntentBid[];
};

function memoryBids(): IntentBid[] {
  if (!globalForIntent.__bmbIntentBids) {
    globalForIntent.__bmbIntentBids = [];
  }
  return globalForIntent.__bmbIntentBids;
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
    artworkUrl: row.artworkUrl ?? null,
    proxyMaxUsd: row.proxyMaxUsd ?? null,
    floorSaveUsd: row.floorSaveUsd ?? null,
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
};

type PlaceIntentOptions = {
  /** Internal — proxy agent recursion depth. */
  proxyDepth?: number;
};

export type PlaceIntentResult =
  | { ok: true; bid: IntentBid }
  | { ok: false; error: string };

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

/** Approved seats for one bidder — winner portal. */
export async function listApprovedBidsForUser(
  userId: UserId,
): Promise<IntentBid[]> {
  const bids = await listBidsForUser(userId);
  return bids.filter((bid) => bid.status === "approved");
}

export async function standingForPanel(panelId: string): Promise<number> {
  const panel = panelById(panelId);
  if (!panel) throw new Error(`Unknown panel: ${panelId}`);
  const active = (await listBidsForPanel(panelId)).filter(
    (bid) =>
      (bid.status === "listed" || bid.status === "approved") &&
      !isFloorSaveBid(bid),
  );
  if (active.length === 0) return panel.openingUsd;
  return Math.max(...active.map((bid) => bid.standingUsd));
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

export async function placeIntentBid(
  input: PlaceIntentInput,
  opts?: PlaceIntentOptions,
): Promise<PlaceIntentResult> {
  const panel = panelById(input.panelId);
  if (!panel) return { ok: false, error: "Unknown panel." };

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
    const opBan = assertOperatorBanAllowed({ brandLabel, tradeLabel, rules });
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
        }
      }
    } else {
      const dbForWithdraw = getDb();
      if (!dbForWithdraw) {
        return { ok: false, error: "Intent ledger is not configured." };
      }
      await dbForWithdraw
        .update(intentBids)
        .set({ status: "withdrawn" })
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
          artworkUrl,
          proxyMaxUsd: null,
          floorSaveUsd: y,
        };
        assertIntentOnly(bid);
        memoryBids().push(bid);
        await notifyIntentStatusSafe({ kind: "listed", bid });
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
        })
        .returning();
      const floorRow = insertedFloor[0];
      if (!floorRow) return { ok: false, error: "Could not record intent." };
      const floorBid = rowToBid(floorRow);
      await notifyIntentStatusSafe({ kind: "listed", bid: floorBid });
      return { ok: true, bid: floorBid };
    }

    const minimum = await minimumIntentUsd(input.panelId);
    const standingUsd = input.standingUsd ?? minimum;
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
          existing.status = "outbid";
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
        artworkUrl,
        proxyMaxUsd,
        floorSaveUsd: null,
      };
      assertIntentOnly(bid);
      memoryBids().push(bid);
      await notifyIntentStatusSafe({ kind: "listed", bid });
      for (const outbid of outbidTargets) {
        await notifyIntentStatusSafe({ kind: "outbid", bid: outbid });
      }
      await runProxyMaxAgent({
        panelId: input.panelId,
        listed: bid,
        outbidTargets,
        proxyDepth,
      });
      const fresh =
        memoryBids().find((row) => row.id === bid.id) ?? bid;
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

    // Neon HTTP: sequential outbid then insert (no interactive txn).
    // Floor-save rows stay listed — they do not hold the seat yet.
    await db
      .update(intentBids)
      .set({ status: "outbid" })
      .where(
        and(
          eq(intentBids.panelId, input.panelId),
          eq(intentBids.status, "listed"),
          ne(intentBids.userId, input.userId),
          isNull(intentBids.floorSaveUsd),
        ),
      );

    const inserted = await db
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
      })
      .returning();

    const row = inserted[0];
    if (!row) return { ok: false, error: "Could not record intent." };
    const bid = rowToBid(row);
    const outbidTargets = priorListed.map((prior) => ({
      ...rowToBid(prior),
      status: "outbid" as const,
    }));
    await notifyIntentStatusSafe({ kind: "listed", bid });
    for (const outbid of outbidTargets) {
      await notifyIntentStatusSafe({ kind: "outbid", bid: outbid });
    }
    await runProxyMaxAgent({
      panelId: input.panelId,
      listed: bid,
      outbidTargets,
      proxyDepth,
    });
    const fresh = (await getIntentBidById(bid.id)) ?? bid;
    return { ok: true, bid: fresh };
  } catch {
    // Slice 6.5 — structured failure only; never claim the intent listed.
    return { ok: false, error: INTENT_WRITE_FAILED };
  }
}

/**
 * Slice 9.1 — when a listed mark outbids holders with a proxy ceiling,
 * the agent steps standing + max($250, 10%) up to proxyMax. Still no card.
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
  const able = input.outbidTargets.filter(
    (target) =>
      target.userId !== input.listed.userId &&
      target.proxyMaxUsd != null &&
      target.proxyMaxUsd >= next,
  );
  if (able.length === 0) return;

  able.sort((a, b) => {
    const byMax = (b.proxyMaxUsd ?? 0) - (a.proxyMaxUsd ?? 0);
    if (byMax !== 0) return byMax;
    return b.createdAt.localeCompare(a.createdAt);
  });
  const agent = able[0];
  if (!agent) return;

  await placeIntentBid(
    {
      panelId: input.panelId,
      userId: agent.userId,
      brandLabel: agent.brandLabel,
      tradeLabel: agent.tradeLabel,
      standingUsd: next,
      artworkUrl: agent.artworkUrl,
      proxyMaxUsd: agent.proxyMaxUsd,
    },
    { proxyDepth: input.proxyDepth + 1 },
  );
}

export async function setIntentStatus(
  bidId: string,
  status: Extract<IntentBidStatus, "approved" | "rejected" | "withdrawn">,
  opts?: { note?: string },
): Promise<PlaceIntentResult> {
  if (useMemoryStore()) {
    const bid = memoryBids().find((row) => row.id === bidId);
    if (!bid) return { ok: false, error: "Bid not found." };
    if (status === "approved") {
      const ban = assertTradeAllowed({
        brandLabel: bid.brandLabel,
        tradeLabel: bid.tradeLabel,
      });
      if (!ban.ok) return { ok: false, error: ban.error };
    }
    bid.status = status;
    assertIntentOnly(bid);
    if (status === "approved" || status === "rejected") {
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

  if (status === "approved") {
    const existing = await db
      .select()
      .from(intentBids)
      .where(eq(intentBids.id, bidId))
      .limit(1);
    const current = existing[0];
    if (!current) return { ok: false, error: "Bid not found." };
    const ban = assertTradeAllowed({
      brandLabel: current.brandLabel,
      tradeLabel: current.tradeLabel,
    });
    if (!ban.ok) return { ok: false, error: ban.error };
  }

  const updated = await db
    .update(intentBids)
    .set({ status })
    .where(eq(intentBids.id, bidId))
    .returning();
  const row = updated[0];
  if (!row) return { ok: false, error: "Bid not found." };
  const bid = rowToBid(row);
  if (status === "approved" || status === "rejected") {
    await notifyIntentStatusSafe({
      kind: status,
      bid,
      note: opts?.note,
    });
  }
  return { ok: true, bid };
}

export async function resetIntentStoreForTests(): Promise<void> {
  resetArtworkBlobStoreForTests();
  if (useMemoryStore()) {
    globalForIntent.__bmbIntentBids = [];
    return;
  }
  const db = getDb();
  if (!db) return;
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
 * Slice 4.5 — whole-truck $120,000 intent.
 * Releases standing holders on every panel, then lists the same brand on
 * all twelve seats at $10,000 each (intent only — not charged).
 * Rejects when public pledged standing is already at buyout.
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

  // Release standing winners so one brand can take every panel.
  for (const panel of PANELS) {
    const bids = await listBidsForPanel(panel.id);
    for (const bid of bids) {
      if (bid.status === "listed" || bid.status === "approved") {
        const released = await setIntentStatus(bid.id, "withdrawn");
        if (!released.ok) {
          return { ok: false, error: released.error };
        }
      }
    }
  }

  const placed: IntentBid[] = [];
  for (const panel of PANELS) {
    const result = await placeIntentBid({
      panelId: panel.id,
      userId: input.userId,
      brandLabel,
      tradeLabel,
      standingUsd: WHOLE_TRUCK_PANEL_USD,
      artworkUrl: input.artworkUrl,
    });
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    placed.push(result.bid);
  }

  return { ok: true, bids: placed };
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
export async function loadStandingHoldersByPanel(): Promise<
  Map<string, { brandLabel: string; tradeLabel: string; standingUsd: number }>
> {
  const map = new Map<
    string,
    { brandLabel: string; tradeLabel: string; standingUsd: number }
  >();
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
      });
    }
  }
  return map;
}

