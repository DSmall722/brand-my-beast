import { listBidsPendingApproval } from "./intent-store";
import {
  completeSameDayMockup,
  previewKeyFor,
  type ImagineMockup,
} from "./mockup";

const globalForMockup = globalThis as typeof globalThis & {
  __bmbImagineMockups?: Map<string, ImagineMockup>;
};

function mockupMap(): Map<string, ImagineMockup> {
  if (!globalForMockup.__bmbImagineMockups) {
    globalForMockup.__bmbImagineMockups = new Map();
  }
  return globalForMockup.__bmbImagineMockups;
}

export async function getMockupForBid(
  bidId: string,
): Promise<ImagineMockup | null> {
  return mockupMap().get(bidId) ?? null;
}

export async function listMockupsForBids(
  bidIds: string[],
): Promise<Record<string, ImagineMockup>> {
  const out: Record<string, ImagineMockup> = {};
  for (const id of bidIds) {
    const row = mockupMap().get(id);
    if (row) out[id] = row;
  }
  return out;
}

export type QueueMockupResult =
  | { ok: true; mockup: ImagineMockup }
  | { ok: false; error: string };

/**
 * Operator queues a same-day Imagine placeholder for a listed intent.
 * Memory store for P2 scaffold — durable table lands with real Imagine wiring.
 */
export async function queueImagineMockup(input: {
  bidId: string;
  finish: "wrap" | "etch";
}): Promise<QueueMockupResult> {
  const pending = await listBidsPendingApproval();
  const bid = pending.find((row) => row.id === input.bidId);
  if (!bid) {
    return { ok: false, error: "Listed intent not found for mockup." };
  }

  const existing = mockupMap().get(bid.id);
  if (existing?.status === "ready") {
    return { ok: true, mockup: existing };
  }

  const now = new Date().toISOString();
  const draft = {
    id: `mock_${bid.id}`,
    bidId: bid.id,
    panelId: bid.panelId,
    brandLabel: bid.brandLabel,
    tradeLabel: bid.tradeLabel,
    finish: input.finish,
    previewKey: previewKeyFor({
      panelId: bid.panelId,
      brandLabel: bid.brandLabel,
    }),
    createdAt: now,
  };

  const mockup = completeSameDayMockup(draft);
  mockupMap().set(bid.id, mockup);
  return { ok: true, mockup };
}

export async function resetMockupStoreForTests(): Promise<void> {
  mockupMap().clear();
}
