import type { IntentBid } from "@/lib/intent";

export type ArtworkApproval = "pending" | "approved";

type MarkArt = Pick<IntentBid, "status" | "artworkUrl" | "artworkApproval">;

export function artworkApprovalForNewMark(
  artworkUrl: string | null,
): ArtworkApproval | null {
  return artworkUrl ? "pending" : null;
}

export function artworkApprovalAfterOperatorApprove(
  artworkUrl: string | null,
): ArtworkApproval | null {
  return artworkUrl ? "approved" : null;
}

export function publicLogoUrl(bid: MarkArt): string | null {
  if (!bid.artworkUrl) return null;
  if (bid.artworkApproval === "approved") return bid.artworkUrl;
  if (bid.artworkApproval === "pending" || bid.artworkApproval === null) {
    return null;
  }
  if (bid.status === "approved") return bid.artworkUrl;
  return null;
}
