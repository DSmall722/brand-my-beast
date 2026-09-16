import Link from "next/link";
import { redirect } from "next/navigation";
import { MagicLinkSignInForm } from "@/components/MagicLinkSignInForm";
import { TestSignInForm } from "@/components/TestSignInForm";
import { auth, signIn } from "@/lib/auth";
import { enabledAuthProviders, resolveAuthMode } from "@/lib/auth/mode";
import { PUBLIC_COPY } from "@/lib/public-copy";

type SearchParams = Promise<{ callbackUrl?: string }>;

/**
 * Slice 12.17 — sign-in copy from PUBLIC_COPY.
 * Live mode HTML never shows the CI credentials hatch label.
 */
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
  const copy = PUBLIC_COPY.signIn;

  return (
    <main className="shell auth-page" data-testid="signin-page" data-auth-mode={mode}>
      <p className="eyebrow">BrandMyBeast</p>
      <h1>{copy.heading}</h1>
      <p className="section-lead" data-testid="signin-lead">
        {copy.lead}
      </p>

      {hasTest ? (
        <>
          <p className="auth-hint" data-testid="test-login-hint">
            {copy.testHint}{" "}
            <code>{process.env.AUTH_TEST_PASSWORD ?? "test"}</code>.
          </p>
          <TestSignInForm callbackUrl={callbackUrl} />
        </>
      ) : null}

      {hasResend ? (
        <>
          <p className="auth-hint" data-testid="magic-link-hint">
            {copy.magicLinkHint}
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
          <p data-testid="signin-missing-providers-lead">
            {copy.missingProvidersLead}
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
        </div>
      ) : null}

      <p className="auth-back">
        <Link href="/">Back to the board</Link>
      </p>
    </main>
  );
}
