"use client";

import { useActionState } from "react";
import {
  decideIntentBid,
  type IntentActionState,
} from "@/app/actions/intent";

const initial: IntentActionState = { ok: false };

export function ApprovalButtons({ bidId }: { bidId: string }) {
  const [state, action, pending] = useActionState(decideIntentBid, initial);

  return (
    <div className="approval-actions" data-testid={`approval-actions-${bidId}`}>
      <form action={action}>
        <input type="hidden" name="bidId" value={bidId} />
        <input type="hidden" name="decision" value="approved" />
        <button
          type="submit"
          className="btn btn-signal"
          disabled={pending}
          data-testid={`approve-${bidId}`}
        >
          Approve
        </button>
      </form>
      <form action={action}>
        <input type="hidden" name="bidId" value={bidId} />
        <input type="hidden" name="decision" value="rejected" />
        <button
          type="submit"
          className="btn btn-ghost"
          disabled={pending}
          data-testid={`reject-${bidId}`}
        >
          Reject
        </button>
      </form>
      {state.error ? (
        <p className="auth-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p className="auth-hint" data-testid="approval-message">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
