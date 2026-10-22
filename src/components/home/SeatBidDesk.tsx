"use client";

import { BidDeskProvider, useOpenBid } from "@/components/home/BidDesk";
import type { BidDeskMode, BidPanelQuote } from "@/lib/bid-desk";

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
    <section className="seat-bid" aria-labelledby="seat-bid-title">
      <h2 id="seat-bid-title" className="auth-subhead">
        Place a bid
      </h2>
      <p className="seat-primary">
        <button
          type="button"
          className="btn btn-signal"
          data-testid="seat-primary-cta"
          data-cta="bid"
          onClick={(event) => openBid(panelId, event.currentTarget)}
        >
          Place a bid
        </button>
      </p>
    </section>
  );
}
