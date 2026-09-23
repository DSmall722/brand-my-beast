"use client";

import { BidDeskProvider, useOpenBid } from "@/components/home/BidDesk";
import type { BidDeskMode, BidPanelQuote } from "@/lib/bid-desk";

/**
 * Guest Bid on a seat page. Same desk as the homepage, opened on this panel.
 * Does not send the visitor to sign-in.
 */
export function SeatBidDesk({
  quotes,
  mode,
  panelId,
}: {
  quotes: readonly BidPanelQuote[];
  mode: BidDeskMode;
  panelId: string;
}) {
  return (
    <BidDeskProvider quotes={quotes} mode={mode}>
      <SeatBidButton panelId={panelId} />
    </BidDeskProvider>
  );
}

function SeatBidButton({ panelId }: { panelId: string }) {
  const openBid = useOpenBid();
  return (
    <p className="seat-primary">
      <button
        type="button"
        className="btn btn-signal"
        data-testid="seat-primary-cta"
        data-cta="bid"
        onClick={() => openBid(panelId)}
      >
        Bid
      </button>
    </p>
  );
}
