"use client";

import { useActionState } from "react";
import {
  signInWithTestCredentials,
  type SignInState,
} from "@/app/actions/auth";

const initial: SignInState = { ok: false };

export function TestSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(
    signInWithTestCredentials,
    initial,
  );

  return (
    <form action={action} className="auth-form" data-testid="test-signin-form">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label className="auth-label" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="username"
        placeholder="bidder@example.com"
        data-testid="signin-email"
        className="auth-input"
      />
      <label className="auth-label" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        data-testid="signin-password"
        className="auth-input"
      />
      <button
        type="submit"
        className="btn btn-signal"
        disabled={pending}
        data-testid="signin-submit"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state.error ? (
        <p className="auth-error" data-testid="signin-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
