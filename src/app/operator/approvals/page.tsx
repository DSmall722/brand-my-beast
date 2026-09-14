import Link from "next/link";
import { redirect } from "next/navigation";
import { ApprovalButtons } from "@/components/ApprovalButtons";
import { ImagineMockupControls } from "@/components/ImagineMockupControls";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { formatUsd, isEtchable, PANELS } from "@/lib/campaign";
import { listBidsPendingApproval } from "@/lib/intent-store";
import { listMockupsForBids } from "@/lib/mockup-store";

export default async function OperatorApprovalsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator/approvals");
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main className="shell auth-page" data-testid="operator-denied">
          <h1>Operator only</h1>
          <p className="section-lead">
            This approval thread is limited to operator emails. Set{" "}
            <code>OPERATOR_EMAILS</code> in Vercel.
          </p>
          <Link href="/">Back to the board</Link>
        </main>
      </>
    );
  }

  const pending = await listBidsPendingApproval();
  const mockups = await listMockupsForBids(pending.map((bid) => bid.id));

  return (
    <>
      <SiteChrome />
      <main
        className="shell auth-page approvals-page"
        data-testid="operator-approvals"
      >
        <p className="eyebrow">Operator</p>
        <h1>Intent approvals</h1>
        <p className="section-lead">
          Approve or reject listed intents. Queue same-day Imagine mockup
          placeholders here. No cards are charged.
        </p>

        <p className="approvals-count" data-testid="approvals-count">
          {pending.length === 0 ? "Queue clear" : `${pending.length} waiting`}
        </p>

        {pending.length === 0 ? (
          <div className="empty-state" data-testid="approvals-empty">
            <p>No listed intents waiting.</p>
            <p className="auth-hint">
              New marks show up here when a bidder lists on a panel.
            </p>
            <Link className="btn btn-ghost" href="/#panels">
              Browse panels
            </Link>
          </div>
        ) : (
          <ul
            className="intent-list approval-list"
            data-testid="approvals-list"
          >
            {pending.map((bid) => {
              const panel = PANELS.find((row) => row.id === bid.panelId);
              const etchable = panel ? isEtchable(panel) : false;
              return (
                <li
                  key={bid.id}
                  className="approval-card"
                  data-testid={`approval-row-${bid.id}`}
                >
                  <div className="approval-card-body">
                    <div className="approval-card-title">
                      <strong>{bid.brandLabel}</strong>
                      <span className="auth-hint">Trade: {bid.tradeLabel}</span>
                      <span className="badge badge-status badge-listed">
                        Listed
                      </span>
                    </div>
                    <p className="approval-card-meta">
                      <Link href={`/panels/${bid.panelId}`}>
                        {panel?.name ?? bid.panelId}
                      </Link>
                      {" · "}
                      {formatUsd(bid.standingUsd)}
                      {" · deposit shown "}
                      {formatUsd(bid.depositUsd)}
                    </p>
                    <ImagineMockupControls
                      bidId={bid.id}
                      etchable={etchable}
                      mockup={mockups[bid.id] ?? null}
                    />
                  </div>
                  <ApprovalButtons bidId={bid.id} />
                </li>
              );
            })}
          </ul>
        )}

        <p className="auth-back">
          <Link href="/">Back to the board</Link>
        </p>
      </main>
    </>
  );
}
