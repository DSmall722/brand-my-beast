import Link from "next/link";
import { bidForCheckoutSession } from "@/lib/deposit-flow";
import { hasPaidDeposit } from "@/lib/intent";
import { getIntentBidById } from "@/lib/intent-store";
import { formatUsd } from "@/lib/campaign";

type SearchParams = Promise<{ session_id?: string; bid?: string }>;

export default async function BidReturnPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sessionId = params.session_id ?? "";
  const bySession = sessionId ? await bidForCheckoutSession(sessionId) : null;
  const bid = bySession ?? (params.bid ? await getIntentBidById(params.bid) : null);
  const paid = bid ? hasPaidDeposit(bid) : false;

  return (
    <main className="shell auth-page" data-testid="bid-return">
      <p className="eyebrow">BrandMyBeast</p>
      <h1>{paid ? "Deposit received" : "Deposit pending"}</h1>
      <p className="section-lead" data-testid="bid-return-status">
        {paid && bid
          ? `Deposit received for ${bid.brandLabel} at ${formatUsd(bid.standingUsd)}. It counts on the board. If you win, this deposit is credited to the invoice.`
          : "The deposit is not marked paid yet. The board updates when the payment notice arrives. Refresh this page in a moment."}
      </p>
      <p>
        <Link className="btn btn-panel" href="/">
          Back to the board
        </Link>
      </p>
    </main>
  );
}
