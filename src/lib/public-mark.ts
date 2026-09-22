import type { IntentBid } from "@/lib/intent";

export type ArtworkApproval = "pending" | "approved";

type MarkArt = Pick<IntentBid, "status" | "artworkUrl" | "artworkApproval">;

/** New listed mark: a file waits for the operator. No file, no flag. */
export function artworkApprovalForNewMark(
  artworkUrl: string | null,
): ArtworkApproval | null {
  return artworkUrl ? "pending" : null;
}

/** Operator approve clears the logo. A mark with no file stays name-only. */
export function artworkApprovalAfterOperatorApprove(
  artworkUrl: string | null,
): ArtworkApproval | null {
  return artworkUrl ? "approved" : null;
}

/**
 * Logo URL for public Held by / leaderboard.
 * Pending uploads stay name-only. An approved logo stays public
 * even after the bid is outbid, because the flag is on the artwork.
 * Rows loaded without the flag (older ledger rows) show a logo only
 * while that mark is still operator-approved.
 */
export function publicLogoUrl(bid: MarkArt): string | null {
  if (!bid.artworkUrl) return null;
  if (bid.artworkApproval === "approved") return bid.artworkUrl;
  if (bid.artworkApproval === "pending" || bid.artworkApproval === null) {
    return null;
  }
  if (bid.status === "approved") return bid.artworkUrl;
  return null;
}
