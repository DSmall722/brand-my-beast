"use client";

import { useActionState } from "react";
import {
  signInWithMagicLink,
  type SignInState,
} from "@/app/actions/auth";
import { PUBLIC_COPY } from "@/lib/public-copy";

const initial: SignInState = { ok: false };

export function MagicLinkSignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(
    signInWithMagicLink,
    initial,
  );
  const submitLabel = PUBLIC_COPY.signIn.magicLinkButton;

  return (
    <form
      action={action}
      className="auth-form"
      data-testid="magic-link-form"
    >
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <label className="auth-label" htmlFor="magic-email">
        Email
      </label>
      <input
        id="magic-email"
        name="email"
        type="email"
        required
        autoComplete="username"
        placeholder="you@brand.com"
        data-testid="magic-link-email"
        className="auth-input"
      />
      <button
        type="submit"
        className="btn btn-signal"
        disabled={pending}
        data-testid="magic-link-submit"
      >
        {pending ? "Sending link…" : submitLabel}
      </button>
      {state.error ? (
        <p className="auth-error" data-testid="magic-link-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
