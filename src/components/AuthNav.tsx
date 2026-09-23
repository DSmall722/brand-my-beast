import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";

export async function AuthNav({
  showGuestSignIn = false,
}: {
  /** Guest header stays clear. The public path is the email link on /signin. */
  showGuestSignIn?: boolean;
} = {}) {
  const session = await auth();

  if (session?.user) {
    return (
      <div className="auth-nav" data-testid="auth-nav">
        <Link className="nav-link" href="/account" data-testid="account-link">
          Account
        </Link>
        <form action={signOutAction}>
          <button
            type="submit"
            className="nav-link nav-button"
            data-testid="signout-button"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  if (!showGuestSignIn) return null;

  return (
    <div className="auth-nav" data-testid="auth-nav">
      <Link className="nav-link" href="/signin" data-testid="signin-link">
        Sign in
      </Link>
    </div>
  );
}
