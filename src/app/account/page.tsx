import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/app/actions/auth";
import { SiteChrome } from "@/components/SiteChrome";
import { auth } from "@/lib/auth";
import { isOperatorEmail } from "@/lib/auth/operator";
import {
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "@/lib/campaign";
import { intentStatusClass, intentStatusLabel } from "@/lib/intent-labels";
import { listBidsForUser } from "@/lib/intent-store";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/account");
  }

  const email = session.user.email ?? "unknown";
  const userId = session.user.id;
  const operator = isOperatorEmail(session.user.email);
  const intents = await listBidsForUser(userId);

  return (
    <>
      <SiteChrome />
      <main className="shell auth-page" data-testid="account-page">
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
                  </li>
                );
              })}
            </ul>
          )}
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
            <Link
              className="btn btn-ghost"
              href="/operator/approvals"
              data-testid="account-approvals-link"
            >
              Intent approvals
            </Link>
          ) : null}
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
