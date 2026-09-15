"use client";

import { useActionState } from "react";
import {
  submitBanRule,
  type BanListActionState,
} from "@/app/actions/ban-list";

const initial: BanListActionState = { ok: false };

export function BanListForm() {
  const [state, action, pending] = useActionState(submitBanRule, initial);

  return (
    <form
      action={action}
      className="auth-form"
      data-testid="operator-ban-list-form"
    >
      <label className="auth-label" htmlFor="ban-pattern">
        Ban pattern
      </label>
      <input
        id="ban-pattern"
        name="pattern"
        type="text"
        required
        minLength={2}
        maxLength={80}
        className="auth-input"
        data-testid="ban-pattern"
        placeholder="substring match on brand + trade"
      />
      <label className="auth-label" htmlFor="ban-note">
        Note (optional)
      </label>
      <input
        id="ban-note"
        name="note"
        type="text"
        maxLength={280}
        className="auth-input"
        data-testid="ban-note"
      />
      <button
        type="submit"
        className="btn btn-signal"
        disabled={pending}
        data-testid="ban-submit"
      >
        {pending ? "Saving…" : "Add ban + hard-reject matches"}
      </button>
      {state.error ? (
        <p className="auth-error" data-testid="ban-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid="ban-success">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
