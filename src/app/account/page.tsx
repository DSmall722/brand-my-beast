import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { SiteChrome } from "@/components/SiteChrome";
import { WithdrawPendingButton } from "@/components/WithdrawPendingButton";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import { isShopPartnerEmail } from "@/lib/auth/shop-partner";
import {
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  TRUCK_EXISTS,
  formatUsd,
} from "@/lib/campaign";
import { listApprovalNotesForBids } from "@/lib/approval-note-store";
import { intentStatusClass, intentStatusLabel } from "@/lib/intent-labels";
import { listBidsForUser } from "@/lib/intent-store";
import { attachWaitlistAccount } from "@/lib/waitlist";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/account");
  }

  const email = session.user.email ?? "unknown";
  const userId = session.user.id;
  if (!userId) {
    redirect("/signin?callbackUrl=/account");
  }
  const operator = isOperatorEmail(session.user.email);
  const shopPartner = isShopPartnerEmail(session.user.email);
  const intents = await listBidsForUser(userId);
  const notes = await listApprovalNotesForBids(intents.map((bid) => bid.id));
  const waitlistRow =
    email !== "unknown"
      ? await attachWaitlistAccount({ email, userId })
      : null;

  return (
    <>
      <SiteChrome />
      <main
        className="shell auth-page"
        data-testid="account-page"
        data-truck-exists={TRUCK_EXISTS ? "true" : "false"}
      >
        <p className="eyebrow">BrandMyBeast</p>
        <h1>Account</h1>
        <p className="section-lead">
          Signed in for intent bids only. Floor {formatUsd(FLOOR_USD)}. Buyout{" "}
          {formatUsd(GOAL_USD)}. Deposit shown later is {DEPOSIT_PERCENT}% — not
          charged here.
        </p>

        <dl className="auth-dl">
          <div>
            <dt>Email</dt>
            <dd data-testid="account-email">{email}</dd>
          </div>
          <div>
            <dt>User id</dt>
            <dd data-testid="account-user-id">{userId}</dd>
          </div>
        </dl>

        {waitlistRow ? (
          <p
            className="auth-hint"
            data-testid="account-waitlist-row"
            data-waitlist-email={waitlistRow.email}
            data-waitlist-user-id={waitlistRow.userId ?? ""}
            data-waitlist-created-at={waitlistRow.createdAt}
          >
            This email is on the waitlist. Signing in kept that row — it was not
            deleted. Still no card charge.
          </p>
        ) : (
          <p className="auth-hint" data-testid="account-waitlist-absent">
            Not on the waitlist yet. You can still list an intent mark below.
          </p>
        )}

        <p className="auth-hint" data-testid="intent-only-note">
          Pick a panel to list an intent mark. No Stripe capture, no close clock
          on this path. Waitlist signup on the board still does not charge cards.
        </p>

        <p className="auth-hint" data-testid="waitlist-intent-glue">
          Came from the waitlist? Open a panel and list an intent mark — deposit
          is shown later, never charged on P2.
        </p>

        <section
          className="account-intents"
          aria-labelledby="account-intents-title"
          data-testid="account-intents"
        >
          <h2 id="account-intents-title" className="auth-subhead">
            Your panel intents
          </h2>
          {intents.length === 0 ? (
            <p className="empty-state" data-testid="account-intents-empty">
              No intents yet. List a mark on a panel — still no card charge.
            </p>
          ) : (
            <ul className="intent-list" data-testid="account-intents-list">
              {intents.map((bid) => {
                const panel = PANELS.find((row) => row.id === bid.panelId);
                return (
                  <li
                    key={bid.id}
                    className="intent-row"
                    data-testid={`account-intent-${bid.id}`}
                  >
                    <div className="intent-row-main">
                      <strong className="intent-brand">
                        <Link href={`/panels/${bid.panelId}`}>
                          {panel?.name ?? bid.panelId}
                        </Link>
                        {" · "}
                        {bid.brandLabel}
                        {" · "}
                        <span data-testid={`account-intent-trade-${bid.id}`}>{bid.tradeLabel}</span>
                      </strong>
                      <span className="intent-mark">
                        {formatUsd(bid.standingUsd)}
                      </span>
                    </div>
                    <div className="intent-row-meta">
                      <span className={intentStatusClass(bid.status)}>
                        {intentStatusLabel(bid.status)}
                      </span>
                      <span className="auth-hint">
                        Deposit shown {formatUsd(bid.depositUsd)}
                      </span>
                    </div>
                    {bid.status === "outbid" ? (
                      <p
                        className="failed-winner-banner account-outbid-banner"
                        data-testid={`account-outbid-waitlist-${bid.id}`}
                      >
                        Outbid on this seat — still no charge.{" "}
                        <Link href="/#waitlist">Join the waitlist</Link> for the
                        next open panel, or{" "}
                        <Link href={`/panels/${bid.panelId}`}>re-list higher</Link>
                        .
                      </p>
                    ) : null}
                    {bid.status === "listed" ? (
                      <WithdrawPendingButton bidId={bid.id} />
                    ) : null}
                    {bid.status === "approved" ? (
                      <p
                        className="auth-hint"
                        data-testid={`account-approved-needs-operator-${bid.id}`}
                      >
                        Approved needs operator. You cannot withdraw this
                        intent.
                      </p>
                    ) : null}
                    {bid.status === "rejected" && notes[bid.id]?.note ? (
                      <p
                        className="account-reject-note"
                        data-testid={`account-reject-note-${bid.id}`}
                      >
                        Operator note: {notes[bid.id].note}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="account-approval-thread"
          aria-labelledby="account-approval-thread-title"
          data-testid="account-approval-thread"
        >
          <h2 id="account-approval-thread-title" className="auth-subhead">
            Approval thread
          </h2>
          <p className="auth-hint" data-testid="account-approval-thread-lead">
            Operator decisions on your artwork land here before any vinyl or
            etch work. Still no card capture.
          </p>
          {(() => {
            const threaded = intents.filter(
              (bid) => bid.status === "approved" || bid.status === "rejected",
            );
            if (threaded.length === 0) {
              return (
                <p
                  className="empty-state"
                  data-testid="account-approval-thread-empty"
                >
                  No operator decisions yet. Listed intents wait in the approval
                  queue.
                </p>
              );
            }
            return (
              <ul
                className="approval-thread-list"
                data-testid="account-approval-thread-list"
              >
                {threaded.map((bid) => {
                  const panel = PANELS.find((row) => row.id === bid.panelId);
                  const note = notes[bid.id];
                  return (
                    <li
                      key={bid.id}
                      className="approval-thread-row"
                      data-testid={`account-approval-thread-row-${bid.id}`}
                      data-decision={bid.status}
                    >
                      <div className="approval-thread-row-main">
                        <strong>
                          <Link href={`/panels/${bid.panelId}`}>
                            {panel?.name ?? bid.panelId}
                          </Link>
                          {" · "}
                          {bid.brandLabel}
                        </strong>
                        <span
                          className={intentStatusClass(bid.status)}
                          data-testid={`account-approval-decision-${bid.id}`}
                        >
                          {intentStatusLabel(bid.status)}
                        </span>
                      </div>
                      {bid.status === "rejected" && note?.note ? (
                        <p
                          className="account-reject-note"
                          data-testid={`account-approval-reject-note-${bid.id}`}
                        >
                          Operator note: {note.note}
                        </p>
                      ) : null}
                      {bid.status === "approved" ? (
                        <p
                          className="account-approve-note"
                          data-testid={`account-approval-approve-note-${bid.id}`}
                        >
                          {note?.note?.trim()
                            ? `Operator note: ${note.note}`
                            : "Listed — artwork cleared the operator gate."}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            );
          })()}
        </section>

        <div className="auth-actions">
          <Link
            className="btn btn-signal"
            href="/panels/hood"
            data-testid="account-panel-intent-link"
          >
            List intent on Hood
          </Link>
          <Link className="btn btn-ghost" href="/#panels">
            Browse panels
          </Link>
          {operator ? (
            <>
              <Link
                className="btn btn-ghost"
                href="/operator"
                data-testid="account-approvals-link"
              >
                Intent approvals
              </Link>
              <Link
                className="btn btn-ghost"
                href="/operator/waitlist"
                data-testid="account-waitlist-link"
              >
                Waitlist signups
              </Link>
            </>
          ) : null}
          {shopPartner ? (
            <Link
              className="btn btn-ghost"
              href="/partner/shop"
              data-testid="account-shop-link"
            >
              Wrap shop sheet
            </Link>
          ) : null}
          <Link
            className="btn btn-ghost"
            href="/account/wins"
            data-testid="account-wins-link"
          >
            Winner portal
          </Link>
          <Link className="btn btn-ghost" href="/">
            Back to the board
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="btn btn-ghost"
              data-testid="account-signout"
            >
              Sign out
            </button>
          </form>
        </div>
      </main>
    </>
  );
}
