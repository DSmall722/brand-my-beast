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
  formatUsd,
} from "@/lib/campaign";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin?callbackUrl=/account");
  }

  const email = session.user.email ?? "unknown";
  const userId = session.user.id;
  const operator = isOperatorEmail(session.user.email);

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
          on this path.
        </p>

        <div className="auth-actions">
          <Link className="btn btn-signal" href="/#panels">
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
