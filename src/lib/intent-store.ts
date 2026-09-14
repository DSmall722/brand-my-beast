/**
 * Intent bid ledger — memory (CI/local) or Postgres (DATABASE_URL).
 * Intent only — never stores Stripe/capture fields. See P2.md.
 */

import { and, asc, desc, eq, ne } from "drizzle-orm";
import { PANELS, type Panel } from "./campaign";
import { getDb } from "./db";
import { intentBids, type IntentBidRow } from "./db/schema";
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

function useMemoryStore(): boolean {
  if (process.env.INTENT_MODE === "memory") return true;
  if (process.env.INTENT_MODE === "postgres") return false;
  return (
    !process.env.DATABASE_URL && process.env.NODE_ENV !== "production"
  );
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
    bid.status = status;
    assertIntentOnly(bid);
    return { ok: true, bid };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Intent ledger is not configured." };
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
