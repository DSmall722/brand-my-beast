import Link from "next/link";
import { redirect } from "next/navigation";
import { ApprovalButtons } from "@/components/ApprovalButtons";
import { IntentArtworkPreview } from "@/components/IntentArtworkPreview";
import { ArtworkApprovalChecklist } from "@/components/ArtworkApprovalChecklist";
import { ImagineMockupControls } from "@/components/ImagineMockupControls";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { formatUsd, isEtchable, PANELS } from "@/lib/campaign";
import { listApprovalNotesForBids } from "@/lib/approval-note-store";
import {
  listBidsPendingApproval,
  listDecidedBids,
} from "@/lib/intent-store";
import { listMockupsForBids } from "@/lib/mockup-store";
import {
  operatorCampaignLockLabels,
  operatorCampaignLocks,
} from "@/lib/operator-campaign-locks";

export default async function OperatorPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/operator");
  }
  if (!isOperatorEmail(session.user.email)) {
    return (
      <>
        <SiteChrome />
        <main id="main-content" className="shell auth-page" data-testid="operator-denied">
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
  const decided = await listDecidedBids();
  const mockups = await listMockupsForBids(pending.map((bid) => bid.id));
  const decidedNotes = await listApprovalNotesForBids(
    decided.map((bid) => bid.id),
  );
  const locks = operatorCampaignLocks();
  const lockLabels = operatorCampaignLockLabels();

  return (
    <>
      <SiteChrome />
      <main
        id="main-content"
        className="shell auth-page approvals-page"
        data-testid="operator-approvals"
        data-operator-root="true"
      >
        <p className="eyebrow">Operator</p>
        <h1>Intent approvals</h1>
        <p className="section-lead">
          Artwork checklist, approve or reject with a veto note, queue same-day
          Imagine placeholders. No cards are charged.
        </p>
        <p className="auth-hint" data-testid="operator-internal-nav">
          <Link
            href="/operator/waitlist"
            data-testid="operator-waitlist-link"
          >
            Waitlist signups
          </Link>
        </p>

        <aside
          className="operator-campaign-locks"
          data-testid="operator-campaign-locks"
          data-editable={locks.editable ? "true" : "false"}
          aria-label="Campaign locks"
        >
          <p className="operator-campaign-locks-lead">
            Campaign locks — display only. Operator UI cannot edit floor,
            buyout, or close.
          </p>
          <dl className="operator-campaign-locks-grid">
            <div>
              <dt>Floor</dt>
              <dd data-testid="operator-lock-floor">{lockLabels.floor}</dd>
            </div>
            <div>
              <dt>Buyout</dt>
              <dd data-testid="operator-lock-goal">{lockLabels.goal}</dd>
            </div>
            <div>
              <dt>Close</dt>
              <dd data-testid="operator-lock-close">{lockLabels.close}</dd>
            </div>
          </dl>
        </aside>

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
                    <IntentArtworkPreview artworkUrl={bid.artworkUrl} bidId={bid.id} />
                    <ArtworkApprovalChecklist etchable={etchable} />
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

        <section
          className="approvals-decided"
          aria-labelledby="approvals-decided-title"
          data-testid="approvals-decided"
        >
          <h2 id="approvals-decided-title" className="auth-subhead">
            Decided
          </h2>
          {decided.length === 0 ? (
            <p className="auth-hint" data-testid="approvals-decided-empty">
              No approvals or rejects yet.
            </p>
          ) : (
            <ul
              className="intent-list decided-list"
              data-testid="approvals-decided-list"
            >
              {decided.map((bid) => {
                const panel = PANELS.find((row) => row.id === bid.panelId);
                const note = decidedNotes[bid.id];
                return (
                  <li
                    key={bid.id}
                    className="decided-row"
                    data-testid={`decided-row-${bid.id}`}
                    data-status={bid.status}
                  >
                    <div className="decided-row-main">
                      <strong>{bid.brandLabel}</strong>
                      <span className="auth-hint">
                        {panel?.name ?? bid.panelId}
                      </span>
                      <span
                        className={`badge badge-status badge-${bid.status}`}
                      >
                        {bid.status === "approved" ? "Approved" : "Rejected"}
                      </span>
                    </div>
                    {note?.note ? (
                      <p
                        className="decided-note"
                        data-testid={`decided-note-${bid.id}`}
                      >
                        {note.note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="auth-back">
          <Link href="/">Back to the board</Link>
        </p>
      </main>
    </>
  );
}
