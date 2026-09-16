import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { formatUsd } from "@/lib/campaign";
import {
  getIntentBidById,
  loadBoardIntentStats,
} from "@/lib/intent-store";
import {
  operatorPrintFacts,
  operatorPrintSeatFromApproved,
} from "@/lib/operator-print-seat";

type RouteContext = { params: Promise<{ bidId: string }> };

/**
 * Slice 13.25 — operator print view for one approved seat (13.23 + 8.6).
 * Printable HTML. Operator auth only. No Stripe / CLOSE_AT.
 */
export default async function OperatorPrintSeatPage({
  params,
}: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    const { bidId } = await params;
    redirect(
      `/signin?callbackUrl=${encodeURIComponent(`/operator/print/${bidId}`)}`,
    );
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main className="shell auth-page" data-testid="operator-print-denied">
          <h1>Operator only</h1>
          <p className="section-lead">
            Seat print view is limited to operator emails.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const { bidId: rawId } = await params;
  const bidId = decodeURIComponent(rawId ?? "").trim();
  if (!bidId) notFound();

  const bid = await getIntentBidById(bidId);
  if (!bid) notFound();

  const board = await loadBoardIntentStats();
  const seatResult = operatorPrintSeatFromApproved({
    bid,
    pledgedUsd: board.pledgedUsd,
  });
  if (!seatResult.ok) {
    return (
      <>
        <SiteChrome />
        <main className="shell auth-page" data-testid="operator-print-error">
          <h1>Cannot print this seat</h1>
          <p className="section-lead" data-testid="operator-print-error-msg">
            {seatResult.error}
          </p>
          <Link href="/operator?status=approved">Back to approvals</Link>
        </main>
      </>
    );
  }

  const facts = operatorPrintFacts(seatResult.seat);

  return (
    <>
      <SiteChrome />
      <main
        className="shell auth-page operator-print-page"
        data-testid="operator-print"
        data-print-sheet="operator-seat"
        data-bid-id={seatResult.seat.bidId}
        data-wrap-term-start={seatResult.seat.wrapTermStart}
        data-finish={seatResult.seat.finish}
        data-etch-lock={seatResult.seat.etchLock}
      >
        <p className="eyebrow no-print">Operator · print</p>
        <h1>{facts.title}</h1>
        <p className="section-lead" data-testid="operator-print-lead">
          One approved seat. Shop ticket facts (8.6) plus wrap term start =
          install day (13.23). Floor {formatUsd(seatResult.seat.floorUsd)}.
          Buyout {formatUsd(seatResult.seat.goalUsd)}. No card charge.
        </p>

        <dl className="operator-print-dl" data-testid="operator-print-facts">
          {facts.rows.map((row) => (
            <div key={row.testId} className="operator-print-row">
              <dt>{row.label}</dt>
              <dd data-testid={row.testId}>{row.value}</dd>
            </div>
          ))}
        </dl>

        <p className="auth-hint" data-testid="operator-print-fences">
          {facts.fences}
        </p>

        <p className="auth-back no-print">
          <Link href="/operator?status=approved">Back to approvals</Link>
          {" · "}
          <Link href={`/panels/${seatResult.seat.panelId}`}>
            Open panel
          </Link>
        </p>
      </main>
    </>
  );
}
