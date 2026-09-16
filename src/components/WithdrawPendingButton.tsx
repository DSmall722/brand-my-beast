"use client";

import { useActionState } from "react";
import {
  withdrawIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";

const initial: IntentActionState = { ok: false };

/** Slice 9.7 — withdraw pending (listed) intent. Approved has no control. */
export function WithdrawPendingButton({
  bidId,
  updatedAt,
}: {
  bidId: string;
  /** Slice 12.2 — optimistic lock token from the row the user loaded. */
  updatedAt: string;
}) {
  const [state, action, pending] = useActionState(withdrawIntentBid, initial);

  return (
    <div
      className="intent-withdraw"
      data-testid={`intent-withdraw-${bidId}`}
    >
      <form action={action}>
        <input type="hidden" name="bidId" value={bidId} />
        <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
        <button
          type="submit"
          className="btn btn-ghost"
          disabled={pending}
          data-testid={`intent-withdraw-submit-${bidId}`}
        >
          Withdraw pending intent
        </button>
      </form>
      {state.error ? (
        <p
          className="auth-error"
          role="alert"
          data-testid={`intent-withdraw-error-${bidId}`}
        >
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p
          className="auth-hint"
          data-testid={`intent-withdraw-message-${bidId}`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
