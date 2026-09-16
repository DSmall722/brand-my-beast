"use client";

import { useActionState } from "react";
import {
  deleteAccountAction,
  type DeleteAccountState,
} from "@/app/actions/auth";

const initial: DeleteAccountState = { ok: false };

/**
 * Slice 12.16 — delete account: anonymize bid user ids, keep standing amounts.
 */
export function DeleteAccountButton() {
  const [state, action, pending] = useActionState(deleteAccountAction, initial);

  return (
    <div className="account-delete" data-testid="account-delete">
      <form action={action}>
        <button
          type="submit"
          className="btn btn-ghost"
          disabled={pending}
          data-testid="account-delete-submit"
        >
          Delete account
        </button>
      </form>
      <p className="auth-hint" data-testid="account-delete-hint">
        Removes your login link from bids. Public standing amounts stay on the
        board. Intent only — no card charge.
      </p>
      {state.error ? (
        <p
          className="auth-error"
          role="alert"
          data-testid="account-delete-error"
        >
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
