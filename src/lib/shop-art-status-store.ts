/**
 * Slice 12.24 — partner marks on approved seat art.
 * Slice 13.22 — shop-ready requires vector URL or artwork blob key.
 * Memory store for P2 / CI. No card capture.
 */

import { getIntentBidById } from "./intent-store";
import {
  type ShopArtStatus,
  parseShopArtStatus,
} from "./shop-art-status";
import { assertArtworkAllowsShopReady } from "./shop-ready-artwork";

export type ShopArtStatusRow = {
  bidId: string;
  status: ShopArtStatus;
  updatedAt: string;
  updatedByEmail: string | null;
};

const globalForShopArt = globalThis as typeof globalThis & {
  __bmbShopArtStatus?: Map<string, ShopArtStatusRow>;
};

function statusMap(): Map<string, ShopArtStatusRow> {
  if (!globalForShopArt.__bmbShopArtStatus) {
    globalForShopArt.__bmbShopArtStatus = new Map();
  }
  return globalForShopArt.__bmbShopArtStatus;
}

export async function getShopArtStatus(
  bidId: string,
): Promise<ShopArtStatus> {
  return statusMap().get(bidId)?.status ?? "unset";
}

export async function listShopArtStatusesForBids(
  bidIds: readonly string[],
): Promise<Record<string, ShopArtStatus>> {
  const out: Record<string, ShopArtStatus> = {};
  for (const id of bidIds) {
    out[id] = statusMap().get(id)?.status ?? "unset";
  }
  return out;
}

export type SetShopArtStatusResult =
  | { ok: true; row: ShopArtStatusRow }
  | { ok: false; error: string };

/**
 * Partner marks approved-seat art as shop-ready or needs-fix.
 */
export async function setShopArtStatus(input: {
  bidId: string;
  status: string;
  actorEmail: string | null;
}): Promise<SetShopArtStatusResult> {
  const status = parseShopArtStatus(input.status);
  if (!status || status === "unset") {
    return {
      ok: false,
      error: "Mark art as shop-ready or needs-fix.",
    };
  }

  const bid = await getIntentBidById(input.bidId);
  if (!bid) {
    return { ok: false, error: "Seat not found." };
  }
  if (bid.status !== "approved") {
    return {
      ok: false,
      error: "Only approved seats can take a shop art mark.",
    };
  }

  // Slice 13.22 — shop-ready is vector URL or blob key only (not screenshot raster).
  if (status === "shop-ready") {
    const artGate = assertArtworkAllowsShopReady(bid.artworkUrl);
    if (!artGate.ok) {
      return { ok: false, error: artGate.error };
    }
  }

  const row: ShopArtStatusRow = {
    bidId: bid.id,
    status,
    updatedAt: new Date().toISOString(),
    updatedByEmail: input.actorEmail,
  };
  statusMap().set(bid.id, row);
  return { ok: true, row };
}

export async function resetShopArtStatusStoreForTests(): Promise<void> {
  statusMap().clear();
}
