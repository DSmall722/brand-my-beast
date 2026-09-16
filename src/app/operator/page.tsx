import Link from "next/link";
import { redirect } from "next/navigation";
import { ApprovalButtons } from "@/components/ApprovalButtons";
import { IntentArtworkPreview } from "@/components/IntentArtworkPreview";
import { ArtworkApprovalChecklist } from "@/components/ArtworkApprovalChecklist";
import { ImagineMockupControls } from "@/components/ImagineMockupControls";
import { MockupQueue } from "@/components/MockupQueue";
import { OperatorStatusPanel } from "@/components/OperatorStatusPanel";
import { PreP3Checklist } from "@/components/PreP3Checklist";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { formatUsd, isEtchUnlocked, isEtchable, PANELS } from "@/lib/campaign";
import { listApprovalNotesForBids } from "@/lib/approval-note-store";
import {
  intentStatusClass,
  intentStatusLabel,
} from "@/lib/intent-labels";
import {
  listBidsPendingApproval,
  listBidsWithStatus,
  listDecidedBids,
  loadBoardIntentStats,
} from "@/lib/intent-store";
import { listMockupQueue, listMockupsForBids } from "@/lib/mockup-store";
import {
  OPERATOR_FILTERS,
  operatorFilterLabel,
  operatorFilterToStatus,
  parseOperatorFilter,
  type OperatorFilter,
} from "@/lib/operator-filters";
import {
  operatorCampaignLockLabels,
  operatorCampaignLocks,
} from "@/lib/operator-campaign-locks";
import { OPERATOR_CSV_PATH } from "@/lib/operator-csv";
import { operatorPrintPath } from "@/lib/operator-print-seat";
import { loadOperatorStatus } from "@/lib/operator-status";

type SearchParams = Promise<{ status?: string | string[] }>;

export default async function OperatorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
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

  const params = await searchParams;
  const filter = parseOperatorFilter(params.status);
  const status = operatorFilterToStatus(filter);

  const [pending, filtered, decided, mockupQueue, operatorStatus, board] =
    await Promise.all([
      listBidsPendingApproval(),
      listBidsWithStatus(status),
      listDecidedBids(),
      listMockupQueue(),
      loadOperatorStatus(),
      loadBoardIntentStats(),
    ]);
  const etchUnlocked = isEtchUnlocked(board.pledgedUsd);
  const mockups =
    filter === "pending"
      ? await listMockupsForBids(filtered.map((bid) => bid.id))
      : {};
  const filterNotes =
    filter === "approved" || filter === "rejected"
      ? await listApprovalNotesForBids(filtered.map((bid) => bid.id))
      : {};
  const decidedNotes =
    filter === "pending"
      ? await listApprovalNotesForBids(decided.map((bid) => bid.id))
      : {};
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
        data-operator-filter={filter}
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
          {" · "}
          <Link
            href="/operator/ban-list"
            data-testid="operator-ban-list-link"
          >
            Ban list
          </Link>
          {" · "}
          <Link
            href="/operator/waitlist-domains"
            data-testid="operator-waitlist-domains-link"
          >
            Waitlist domains
          </Link>
          {" · "}
          <Link href="/operator/audit" data-testid="operator-audit-link">
            Audit log
          </Link>
          {" · "}
          <Link href="/operator/mail" data-testid="operator-mail-link">
            Mail dead-letter
          </Link>
          {" · "}
          <Link href="/operator/health" data-testid="operator-health-link">
            Health
          </Link>
          {" · "}
          <a
            href={OPERATOR_CSV_PATH}
            data-testid="operator-csv-download"
          >
            Download CSV
          </a>
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

        <OperatorStatusPanel status={operatorStatus} />

        <PreP3Checklist />

        <MockupQueue mockups={mockupQueue} />

        <nav
          className="operator-filters"
          data-testid="operator-filters"
          aria-label="Intent status filters"
        >
          {OPERATOR_FILTERS.map((id) => (
            <Link
              key={id}
              href={id === "pending" ? "/operator" : `/operator?status=${id}`}
              className={
                filter === id
                  ? "operator-filter-link is-active"
                  : "operator-filter-link"
              }
              data-testid={`operator-filter-${id}`}
              data-active={filter === id ? "true" : "false"}
            >
              {operatorFilterLabel(id)}
              {id === "pending" ? ` (${pending.length})` : ""}
            </Link>
          ))}
        </nav>

        <p className="approvals-count" data-testid="approvals-count">
          {filterCountLabel(filter, filtered.length, pending.length)}
        </p>

        {filtered.length === 0 ? (
          <div className="empty-state" data-testid="approvals-empty">
            <p>No {operatorFilterLabel(filter).toLowerCase()} intents.</p>
            <p className="auth-hint">
              Switch filters above, or wait for new marks on a panel.
            </p>
            <Link className="btn btn-ghost" href="/#panels">
              Browse panels
            </Link>
          </div>
        ) : filter === "pending" ? (
          <ul
            className="intent-list approval-list"
            data-testid="approvals-list"
          >
            {filtered.map((bid) => {
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
                      etchUnlocked={etchUnlocked}
                      mockup={mockups[bid.id] ?? null}
                    />
                  </div>
                  <ApprovalButtons
                    bidId={bid.id}
                    etchable={etchable}
                    etchUnlocked={etchUnlocked}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <ul
            className="intent-list decided-list"
            data-testid={`operator-filter-list-${filter}`}
          >
            {filtered.map((bid) => {
              const panel = PANELS.find((row) => row.id === bid.panelId);
              const note = filterNotes[bid.id];
              return (
                <li
                  key={bid.id}
                  className="decided-row"
                  data-testid={`operator-row-${bid.id}`}
                  data-status={bid.status}
                >
                  <div className="decided-row-main">
                    <strong>{bid.brandLabel}</strong>
                    <span className="auth-hint">
                      {panel?.name ?? bid.panelId} · {formatUsd(bid.standingUsd)}
                    </span>
                    <span className={intentStatusClass(bid.status)}>
                      {intentStatusLabel(bid.status)}
                    </span>
                  </div>
                  {note?.note ? (
                    <p
                      className="decided-note"
                      data-testid={`operator-note-${bid.id}`}
                    >
                      {note.note}
                    </p>
                  ) : null}
                  {bid.status === "approved" ? (
                    <p className="auth-hint">
                      <Link
                        href={operatorPrintPath(bid.id)}
                        data-testid={`operator-print-link-${bid.id}`}
                      >
                        Print seat
                      </Link>
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {filter === "pending" ? (
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
                      {bid.status === "approved" ? (
                        <p className="auth-hint">
                          <Link
                            href={operatorPrintPath(bid.id)}
                            data-testid={`decided-print-link-${bid.id}`}
                          >
                            Print seat
                          </Link>
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        <p className="auth-back">
          <Link href="/">Back to the board</Link>
        </p>
      </main>
    </>
  );
}

function filterCountLabel(
  filter: OperatorFilter,
  count: number,
  pendingCount: number,
): string {
  if (filter === "pending") {
    return pendingCount === 0 ? "Queue clear" : `${pendingCount} waiting`;
  }
  return count === 0
    ? `No ${operatorFilterLabel(filter).toLowerCase()}`
    : `${count} ${operatorFilterLabel(filter).toLowerCase()}`;
}
