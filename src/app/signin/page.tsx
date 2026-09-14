import Link from "next/link";
import { redirect } from "next/navigation";
import { MagicLinkSignInForm } from "@/components/MagicLinkSignInForm";
import { TestSignInForm } from "@/components/TestSignInForm";
import { auth, signIn } from "@/lib/auth";
import { enabledAuthProviders, resolveAuthMode } from "@/lib/auth/mode";

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl =
    params.callbackUrl && params.callbackUrl.startsWith("/")
      ? params.callbackUrl
      : "/account";

  if (session?.user) {
    redirect(callbackUrl);
  }

  const mode = resolveAuthMode();
  const providers = enabledAuthProviders();
  const hasTest = providers.includes("test-login");
  const hasResend = providers.includes("resend");
  const hasGithub = providers.includes("github");
  const liveMissingProviders =
    mode === "live" && !hasResend && !hasGithub && !hasTest;

  return (
    <main className="shell auth-page">
      <p className="eyebrow">BrandMyBeast</p>
      <h1>Sign in</h1>
      <p className="section-lead">
        Accounts unlock intent marks on panels. No cards are charged on this
        path.
      </p>

      {hasTest ? (
        <>
          <p className="auth-hint" data-testid="test-login-hint">
            Test mode: use any <code>@example.com</code> email and password{" "}
            <code>{process.env.AUTH_TEST_PASSWORD ?? "test"}</code>.
          </p>
          <TestSignInForm callbackUrl={callbackUrl} />
        </>
      ) : null}

      {hasResend ? (
        <>
          <p className="auth-hint" data-testid="magic-link-hint">
            Production sign-in: we email a one-time link. No password. No card.
          </p>
          <MagicLinkSignInForm callbackUrl={callbackUrl} />
        </>
      ) : null}

      {hasGithub ? (
        <form
          action={async () => {
            "use server";
            await signIn("github", { redirectTo: callbackUrl });
          }}
          className="auth-oauth"
        >
          <button
            type="submit"
            className="btn btn-ghost"
            data-testid="github-signin"
          >
            Continue with GitHub
          </button>
        </form>
      ) : null}

      {liveMissingProviders ? (
        <div className="auth-missing" data-testid="auth-secrets-missing">
          <p>
            Live Auth.js is on, but no providers are configured yet. The
            operator needs these Vercel env vars:
          </p>
          <ul>
            <li>
              <code>AUTH_SECRET</code>
            </li>
            <li>
              <code>AUTH_URL</code> (e.g. https://brandmybeast.com)
            </li>
            <li>
              <code>RESEND_API_KEY</code>
            </li>
            <li>
              <code>RESEND_FROM</code> (e.g. BrandMyBeast
              &lt;hello@brandmybeast.com&gt;)
            </li>
            <li>
              <code>DATABASE_URL</code> (Auth.js verification tokens)
            </li>
          </ul>
          <p>
            Or set <code>AUTH_MODE=test</code> /{" "}
            <code>AUTH_ENABLE_TEST_LOGIN=1</code> for the credentials path used
            in CI.
          </p>
        </div>
      ) : null}

      <p className="auth-back">
        <Link href="/">Back to the board</Link>
      </p>
    </main>
  );
}
