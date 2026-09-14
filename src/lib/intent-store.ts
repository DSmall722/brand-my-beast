/**
 * Intent bid ledger — memory (CI/local) or Postgres (DATABASE_URL).
 * Intent only — never stores Stripe/capture fields. See P2.md.
 */

import { and, asc, desc, eq, ne } from "drizzle-orm";
import { PANELS, type Panel } from "./campaign";
import { getDb } from "./db";
import { intentBids, type IntentBidRow } from "./db/schema";
import { assertTradeAllowed } from "./banned-trades";
import {
  assertIntentOnly,
  depositUsdForMark,
  nextStandingUsd,
  normalizeTradeLabel,
  type IntentBid,
  type IntentBidStatus,
  type UserId,
} from "./intent";

const STATUSES: readonly IntentBidStatus[] = [
  "listed",
  "outbid",
  "withdrawn",
  "approved",
  "rejected",
] as const;

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
 * Memory is CI/local only. Vercel Production never uses memory (SLICES 1.1),
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
    (bid) => bid.status === "listed" || bid.status === "approved",
  );
  if (active.length === 0) return panel.openingUsd;
  return Math.max(...active.map((bid) => bid.standingUsd));
}

export async function minimumIntentUsd(panelId: string): Promise<number> {
  const panel = panelById(panelId);
  if (!panel) throw new Error(`Unknown panel: ${panelId}`);
  const active = (await listBidsForPanel(panelId)).filter(
    (bid) => bid.status === "listed" || bid.status === "approved",
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

export async function placeIntentBid(
  input: PlaceIntentInput,
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

  const holders = await listHoldingBids();
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

  const minimum = await minimumIntentUsd(input.panelId);
  const standingUsd = input.standingUsd ?? minimum;
  if (standingUsd < minimum) {
    return { ok: false, error: `Mark must be at least ${minimum}.` };
  }

  const depositUsd = depositUsdForMark(standingUsd);

  if (useMemoryStore()) {
    for (const existing of memoryBids()) {
      if (
        existing.panelId === input.panelId &&
        existing.status === "listed" &&
        existing.userId !== input.userId
      ) {
        existing.status = "outbid";
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
      artworkUrl: input.artworkUrl ?? null,
    };
    assertIntentOnly(bid);
    memoryBids().push(bid);
    return { ok: true, bid };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Intent ledger is not configured." };
  }

  // Neon HTTP: sequential outbid then insert (no interactive txn).
  await db
    .update(intentBids)
    .set({ status: "outbid" })
    .where(
      and(
        eq(intentBids.panelId, input.panelId),
        eq(intentBids.status, "listed"),
        ne(intentBids.userId, input.userId),
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
      artworkUrl: input.artworkUrl ?? null,
    })
    .returning();

  const row = inserted[0];
  if (!row) return { ok: false, error: "Could not record intent." };
  return { ok: true, bid: rowToBid(row) };
}

export async function setIntentStatus(
  bidId: string,
  status: Extract<IntentBidStatus, "approved" | "rejected" | "withdrawn">,
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
  return { ok: true, bid: rowToBid(row) };
}

export async function resetIntentStoreForTests(): Promise<void> {
  if (useMemoryStore()) {
    globalForIntent.__bmbIntentBids = [];
    return;
  }
  const db = getDb();
  if (!db) return;
  await db.delete(intentBids);
}

export type BoardIntentStats = {
  pledgedUsd: number;
  seatedPanels: number;
  openSeats: number;
};

/**
 * Honest board totals from active intents (listed/approved standing).
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
      const active = bids.filter(
        (bid) => bid.status === "listed" || bid.status === "approved",
      );
      if (active.length === 0) continue;
      seatedPanels += 1;
      pledgedUsd += Math.max(...active.map((bid) => bid.standingUsd));
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
      .filter((bid) => bid.status === "listed" || bid.status === "approved")
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

