"use client";

import { useActionState } from "react";
import {
  submitDomainBlock,
  type DomainBlockActionState,
} from "@/app/actions/waitlist-domains";

const initial: DomainBlockActionState = { ok: false };

export function WaitlistDomainBlockForm() {
  const [state, action, pending] = useActionState(submitDomainBlock, initial);

  return (
    <form
      action={action}
      className="auth-form"
      data-testid="operator-waitlist-domains-form"
    >
      <label className="auth-label" htmlFor="block-domain">
        Domain to block
      </label>
      <input
        id="block-domain"
        name="domain"
        type="text"
        required
        minLength={3}
        maxLength={253}
        className="auth-input"
        data-testid="waitlist-domain-input"
        placeholder="disposable.example"
      />
      <label className="auth-label" htmlFor="block-domain-note">
        Note (optional)
      </label>
      <input
        id="block-domain-note"
        name="note"
        type="text"
        maxLength={280}
        className="auth-input"
        data-testid="waitlist-domain-note"
      />
      <button
        type="submit"
        className="btn btn-signal"
        disabled={pending}
        data-testid="waitlist-domain-submit"
      >
        {pending ? "Saving…" : "Add domain block"}
      </button>
      {state.error ? (
        <p
          className="auth-error"
          data-testid="waitlist-domain-error"
          role="alert"
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid="waitlist-domain-success">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
